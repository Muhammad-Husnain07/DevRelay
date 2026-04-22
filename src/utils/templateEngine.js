const handlebars = require('handlebars');

function renderTemplate(htmlBody, variables = {}) {
  try {
    const template = handlebars.compile(htmlBody);
    return template(variables);
  } catch (error) {
    console.error('Template render error:', error.message);
    return htmlBody;
  }
}

function validateVariables(template, provided = {}) {
  const errors = [];
  
  if (!template.variables || template.variables.length === 0) {
    return { valid: true };
  }
  
  for (const variable of template.variables) {
    if (variable.required && (provided[variable.name] === undefined || provided[variable.name] === null)) {
      errors.push(`Missing required variable: ${variable.name}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function sanitizeHtml(html) {
  if (!html) return '';
  
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

module.exports = {
  renderTemplate,
  validateVariables,
  sanitizeHtml
};