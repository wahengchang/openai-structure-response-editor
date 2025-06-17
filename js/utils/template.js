// Utility functions for template parsing and rendering
export function extractVariables(template) {
    // Match all {{variable}} occurrences
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    let match;
    const vars = new Set();
    let braceStack = 0;
    for (let i = 0; i < template.length; i++) {
        if (template[i] === '{' && template[i+1] === '{') braceStack++;
        if (template[i] === '}' && template[i+1] === '}') braceStack--;
    }
    if (braceStack !== 0) {
        throw new Error('Unmatched {{ or }} in template');
    }
    while ((match = regex.exec(template)) !== null) {
        vars.add(match[1]);
    }
    return Array.from(vars);
}

export function renderTemplate(template, values) {
    // Replace all {{variable}} with values[variable] or empty string
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, varName) => {
        return (varName in values) ? values[varName] : '';
    });
}

