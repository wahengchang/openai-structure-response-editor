export function linkMatchesSource(link, source, baseUrl = 'http://localhost') {
    try {
        const url = new URL(link, baseUrl);
        const fileParam = url.searchParams.get('file');
        const dataParam = url.searchParams.get('data');
        if (source.type === 'file') {
            return fileParam === source.value && !dataParam;
        }
        if (source.type === 'data') {
            return dataParam === source.value && !fileParam;
        }
        return false;
    } catch {
        return false;
    }
}

export function findUniqueTemplateEntry(templates, source, baseUrl = 'http://localhost') {
    if (!Array.isArray(templates)) return null;
    const matches = [];
    templates.forEach((item, index) => {
        if (item && linkMatchesSource(item.link, source, baseUrl)) matches.push(index);
    });
    return matches.length === 1 ? matches[0] : null;
}
