import {EngineConfig} from "../types";
import {Context} from "../context";
import {CodyResponse, CodyResponseType, isCodyError} from "../../src/general/response";
import {extractTemplateValue, isTemplateString} from "./schemaHelpers";
import {loadSchemaDefinitions} from "./config";
import {getVoFile} from "./file";
import {relativeImportPath, removeNamespace} from "./jsonschema";
import {addToImports} from "./templateHelpers";
import {lcWord} from "../../src/utils/string";
import {writeFileSync} from "../../src/utils/filesystem";

export const refreshBreadcrumbsProviders = (config: EngineConfig, ctx: Context): CodyResponse | null => {
    const defs = loadSchemaDefinitions(ctx);

    if(isCodyError(defs)) {
        return defs;
    }

    const imports: string[] = [];
    const providers: string[] = [];

    for (const route in config.pages) {
        if(!config.pages.hasOwnProperty(route)) {
            continue;
        }

        const page = config.pages[route];

        if(!page.breadcrumbLabel || !isTemplateString(page.breadcrumbLabel)) {
            continue;
        }

        const parsedTemplate = parseTemplateValue(page.breadcrumbLabel);

        if(isCodyError(parsedTemplate)) {
            return parsedTemplate;
        }

        const {vo, property, modifier} = parsedTemplate;


        const voFile = getVoFile(vo, defs);

        if(isCodyError(voFile)) {
            return voFile;
        }

        const voImportPath = relativeImportPath(ctx.feFolder + '/layout', voFile);
        const voWithoutNs = removeNamespace(vo);

        addToImports(imports, `import {${voWithoutNs}} from "${voImportPath}";`);
        addToImports(imports, `import {fetch${voWithoutNs}} from "../action/fetch${voWithoutNs}";`);
        addToImports(imports, `import {make${voWithoutNs}Selector} from "../selector/${lcWord(voWithoutNs)}Selector";`);
        addToImports(imports, `import {useSyncingSelector} from "../core/util/hook/useSyncingSelector";`);

        const providerProps: string[] = [];
        let propsForwarding = '';
        const routePropsValidation: string[] = [];

        if(page.routeParams) {
            page.routeParams.forEach(param => {
                providerProps.push(`    ${param.name}: ${param.type};`);

                propsForwarding += param.type === 'number'? ` ${param.name}={Number(routeParams.${param.name})}` : ` ${param.name}={routeParams.${param.name}}`;

                routePropsValidation.push(`
    if(!Object.keys(routeParams).includes('${param.name}')) {
        console.warn("Cannot provide breadcrumbs label for ${page.component}. Route params is missing '${param.name}'")
        return <></>;
    }                
`
                )
            })
        }

// Template start:
        providers.push(`
interface ${page.component}LabelProviderProps {
${providerProps.join("\n")}
}

const ${page.component}LabelProvider = (props: ${page.component}LabelProviderProps) => {
    const ${lcWord(voWithoutNs)} = useSyncingSelector<${voWithoutNs}|null>(fetch${voWithoutNs}({...props}), make${voWithoutNs}Selector({...props}));

    if(${lcWord(voWithoutNs)}) {
        return <>{${lcWord(voWithoutNs)}.${property}${(modifier? '.'+modifier : '')}}</>;
    }

    return <></>;
}

export const provide${page.component}Label = (routeParams: {[param: string]: string}) => {
${routePropsValidation.join("\n")}
    return <${page.component}LabelProvider${propsForwarding} />
}        
`);
// :Template End

    }

    if(providers.length === 0) {
        return null;
    }

    const content = `import React from 'react';
${imports.join("\n")}    

${providers.join("\n")}

/**
 * Placeholder provider factory to illustrate basic idea of breadcrumb providers
 *
 * @param routeParams Use route params to select/fetch data
 */
export const provideEmptyLabel = (routeParams: {[param: string]: string}) => {

    // Return a React.ReactNode that'll render the breadcrumb label
    return <></>
}
`;

    return writeFileSync(ctx.feFolder + '/layout/DynamicBreadcrumbsProviders.tsx', content);
}

const parseTemplateValue = (template: string): {vo: string, property: string, modifier: string | undefined} | CodyResponse => {
    const templateValue = extractTemplateValue(template);

    if(!templateValue) {
        return {
            cody: `I'm not able to parse template "${template}".`,
            details: `Looks like the template is not wrapped with double curly braces: {{template}}`,
            type: CodyResponseType.Error
        }
    }

    const [vo, property, modifier] = templateValue.split('.');

    if(!vo || !property) {
        return {
            cody: `I'm not able to parse template "${template}".`,
            details: `A breadcrumbs template should specify which data to fetch and the property used as breadcrumb label: {{Object.property}}`,
            type: CodyResponseType.Error
        }
    }

    return {vo, property, modifier};
}
