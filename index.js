const dox = require('dox');

/**
 * Format string as name.
 *
 * @example formatStringForName('module.exports.parser');
 * @param {String} contents String to format.
 * @param {String} [type=''] Type of method, eg: callback, typedef
 * @return {String} Formatted string.
 * @private
 */

const formatStringForName = (content, type = '') => {
  let name = 
    content.toString().replace(/module\.exports\.|\.prototype|\(\)/gu, '');
  
  if (type == 'callback') {
    name = `{Function} ${name}`;
  }
  
  return name;
};

/**
 * Format string as param.
 *
 * @example formatStringForParam('[optional param]');
 * @param {String} contents String to format.
 * @return {String} Formatted string.
 * @private
 */

const formatStringForParam = content => 
  content
    .toString()
    .replace(/\[|\]/gu, '');

/**
 * Format string with link to callbacks, typedefs.
 *
 * @example formatStringForParam('[optional param]');
 * @param {String} contents String to format.
 * @param {Object} linkableObjects List of on-page objects to link to
 * @return {String} Formatted string.
 * @private
 */

const formatStringWithLinkable = (content, linkableObjects = {}) => {
  let string = content.toString().replace(/\[|\]/gu, '');
  if (linkableObjects && linkableObjects[string]) {
    // Use the link
    string = `<a href="#${linkableObjects[string]}">${string}</a>`;
  } else {
    // Escape it
    string = string.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
      return '&#'+i.charCodeAt(0)+';';
   });
  }
  return string;
}

/**
 * Format string as UID.
 *
 * @example formatStringForUID('example string');
 * @param {String} contents String to format.
 * @return {String} Formatted string.
 * @private
 */

const formatStringForUID = content =>
    content
        .toString()
        .toLowerCase()
        .replace(/[^\w\.]+/gu, '-')
        .replace(/^-|-$/gu, '');

/**
 * Checks if the current method is a callback or typedef
 * 
 * @param {Object} method The current method being parsed
 * @return {Bool} If it is a callback or typedef
 * @private
 */
const isCallbackOrTypedef = method => method.tags.length && (method.tags[0].type === 'typedef' || method.tags[0].type === 'callback')

/**
 * Dox parser for doxdox.
 *
 * @example parser(content, 'index.js').then(methods => console.log(methods));
 * @param {String} content Contents of file.
 * @param {String} filename Name of file. Used to generate UIDs.
 * @return {Promise} Promise with methods parsed from contents.
 * @public
 */
const parser = (content, filename) => {
    // console.log( filename);
    const linkableObjects = {};

    const methods = dox
      .parseComments(content, {
          'raw': true,
          'skipSingleStar': true
      })
      .filter(method => !method.ignore);
    
    // First build linkable items
    methods.forEach(method => {
        if (filename == '/Users/alex/workspace/shoppad/ShopPad/pub-site/apps/mesa/services/v8/js/packages/mapping-1.0.0/vendor/Mapping.js') {
            console.log(method);
        }
        // console.log(method);
      if (isCallbackOrTypedef(method)) {
        const name = formatStringForName(method.tags[0].string, method.tags[0].type)
          .replace(/^\{[a-z]*\}\ /i, '');
        const uid = formatStringForUID(`${filename}-${method.tags[0].string}`);
        linkableObjects[name] = uid;
      }
    });

    // Build out
    return methods.map(method => {
          const params = {
            'isPrivate': method.isPrivate,
            'description': method.description.full,
            'empty': !method.description.full && !method.tags.length,
            'line': method.line,
            'params': method.tags
              .filter(tag => tag.type === 'param' && !tag.name.match(/\./u))
              .map(tag => {

                  if (tag.optional) {

                      return `[${formatStringForParam(tag.name)}]`;

                  }

                  return formatStringForParam(tag.name);

              })
              .join(', ')
              .replace(/\], \[/gu, ', ')
              .replace(', [', '[, '),
            'tags': {
                'example': method.tags
                    .filter(tag => tag.type === 'example')
                    .map(tag => tag.string),
                'param': method.tags
                    .filter(tag => tag.type === 'param')
                    .map(tag => ({
                        'name': formatStringForParam(tag.name),
                        'isOptional': tag.optional,
                        'types': tag.types.map(type => formatStringWithLinkable(type, linkableObjects)),
                        'description': tag.description
                    })),
                'property': method.tags
                    .filter(tag => tag.type === 'property')
                    .map(tag => ({
                        'name': formatStringForParam(tag.name),
                        'isOptional': tag.optional,
                        'types': tag.types.map(type => formatStringWithLinkable(type, linkableObjects)),
                        'description': tag.description
                    })),
                'return': method.tags
                    .filter(tag => tag.type === 'return' || tag.type === 'returns')
                    .map(tag => ({
                          'types': tag.types.map(type => formatStringWithLinkable(type, linkableObjects)),
                          'description': tag.description
                    })),
              }
          };
          
          if (method.ctx) {
            // Normal method
            params.uid = formatStringForUID(`${filename}-${method.ctx.string}`);
            params.type = method.ctx.type;
            let name = method.ctx.string;
            if (method.tags.length && method.tags[0].type === 'memberof') {
                name = `${method.tags[0].string.replace('#', '')}.${name}`;
            }
            params.name = formatStringForName(name);
            if (method.ctx.type === 'declaration') {
                params.notFunction = true;
            }
          } else if (isCallbackOrTypedef(method)) {
            // Typedef / callback
            params.uid = formatStringForUID(`${filename}-${method.tags[0].string}`);
            params.type = method.tags[0].type;
            params.name = formatStringForName(method.tags[0].string, params.type);
            params.toBottom = true;
            if (method.tags[0].type === 'typedef') {
              params.notFunction = true;
              params.params = '';
            }
          } else {
            method.empty = true;
          }

          return params;

        })
        .filter(method => !method.empty)
        .sort((a, b) => {
          if (a.toBottom && b.toBottom) {
            return a.type > b.type;
          } else if (a.toBottom) {
            return 1;
          } else if (b.toBottom) {
            return -1;
          }
          return a.line - b.line;
        })
};

module.exports = parser;
