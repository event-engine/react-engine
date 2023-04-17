export const addToImports = (imports: string[], newImport: string): void => {
    if(!imports.includes(newImport)) {
        imports.push(newImport);
    }
}

export const addIconToImports = (imports: string[], icon: string): void => {
    addToImports(imports, `import ${icon}Icon from '@material-ui/icons/${icon}';`)
}
