import Handlebars from 'handlebars';
import { PresentationContent } from '../schemas/presentation';
import { Template } from '../schemas/template';

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('ne', (a, b) => a !== b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('lt', (a, b) => a < b);
Handlebars.registerHelper('and', (a, b) => a && b);
Handlebars.registerHelper('or', (a, b) => a || b);
Handlebars.registerHelper('not', (a) => !a);

// Helper to render bullets as list
Handlebars.registerHelper('renderBullets', (bullets: string[]) => {
  if (!bullets || bullets.length === 0) return '';
  return bullets.map(bullet => `<li class="mb-2">${Handlebars.escapeExpression(bullet)}</li>`).join('');
});

// Helper to render sections
Handlebars.registerHelper('eachSection', function(sections: any[], options: any) {
  if (!sections || sections.length === 0) return '';
  return sections.map((section, index) => {
    return options.fn({ ...section, index, isFirst: index === 0, isLast: index === sections.length - 1 });
  }).join('');
});

export class TemplateEngine {
  /**
   * Render a presentation using a template
   */
  static async render(
    template: Template,
    content: PresentationContent
  ): Promise<string> {
    try {
      // Compile the template
      const compiled = Handlebars.compile(template.html_content);
      
      // Render with content
      const rendered = compiled({
        ...content,
        sections: content.sections.sort((a, b) => (a.order || 0) - (b.order || 0)),
      });
      
      return rendered;
    } catch (error) {
      console.error('Template rendering error:', error);
      throw new Error(`Failed to render template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that content matches template requirements
   */
  static validateContent(template: Template, content: PresentationContent): boolean {
    // Check required fields
    if (template.required_fields) {
      for (const field of template.required_fields) {
        if (field === 'title' && !content.title) return false;
        if (field === 'sections' && (!content.sections || content.sections.length === 0)) return false;
      }
    }

    // Check allowed sections if specified
    if (template.allowed_sections && content.sections) {
      for (const section of content.sections) {
        if (!template.allowed_sections.includes(section.id)) {
          return false;
        }
      }
    }

    return true;
  }
}

