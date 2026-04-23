const { renderTemplate, validateVariables } = require('../src/utils/templateEngine');

describe('templateEngine', () => {
  describe('renderTemplate', () => {
    test('renders simple template', () => {
      const template = '<h1>Hello {{name}}</h1>';
      const result = renderTemplate(template, { name: 'World' });
      expect(result).toBe('<h1>Hello World</h1>');
    });

    test('handles missing variable', () => {
      const template = '<p>{{missing}}</p>';
      const result = renderTemplate(template, {});
      expect(result).toBe('<p></p>');
    });

    test('handles nested variables', () => {
      const template = '<p>{{user.name}}</p>';
      const result = renderTemplate(template, { user: { name: 'John' } });
      expect(result).toBe('<p>John</p>');
    });
  });

  describe('validateVariables', () => {
    test('passes when all required vars provided', () => {
      const template = { variables: [{ name: 'name', required: true }, { name: 'email', required: false }] };
      const result = validateVariables(template, { name: 'John', extra: 'value' });
      expect(result.valid).toBe(true);
    });

    test('fails when required var missing', () => {
      const template = { variables: [{ name: 'name', required: true }] };
      const result = validateVariables(template, {});
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('name');
    });
  });
});