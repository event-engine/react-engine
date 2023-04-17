import {CodyHook} from "../src/board/code";
import {Node, NodeType} from "../src/board/graph";
import {CodyResponse, CodyResponseType, isCodyError, isCodyWarning} from "../src/general/response";
import {
    getSourcesOfType,
    getTargetsOfType,
    getTargetsOfTypeWithParentLookup,
    mergeWithSimilarNodes
} from "../src/utils/node-traversing";
import {Context} from "./context";
import {loadEventEngineConfig, loadSchemaDefinitions, upsertPageConfig} from "./utils/config";
import {
    ColumnRelation,
    ColumnType,
    DocumentMetadata,
    extractDocumentMetadata,
    extractUiMetadata,
    UiMetadata,
    UiSchemaTableColumn,
    UiSchemaTableColumnConfig
} from "./utils/metadata";
import {EngineConfig, SchemaDefinitions} from "./types";
import {
    FileDescription,
    getStateDescriptionFile,
    getVoFile,
    shouldIgnoreFile,
    writeMultipleFilesWithOverrideCheck
} from "./utils/file";
import {
    lcWord,
    nodeNameToCamelCase,
    nodeNameToPascalCase,
    nodeNameToSnakeCase,
    voNameWithNamespace,
    ucWord
} from "../src/utils/string";
import {dereferenceSchema, isArrayType, isStateType, relativeImportPath} from "./utils/jsonschema";
import {writeFileSync} from "../src/utils/filesystem";
import {refreshSidebar} from "./utils/refreshSidebar";
import {refreshRoutes} from "./utils/refreshRoutes";
import {refreshAppIndex} from "./utils/refreshAppIndex";
import {
    aggregateIdentifierForCommand,
    aggregateIdentifierType,
    aggregateTypeForCommand,
    queryPropertyType
} from "./utils/schemaHelpers";
import {type} from "os";
import {refreshBreadcrumbsProviders} from "./utils/refreshBreadcrumbsProviders";
import {addToImports} from "./utils/templateHelpers";
import {UiSchema} from "@rjsf/core";
import * as fs from "fs";

export const onUiHook: CodyHook<Context> = async (ui: Node, ctx: Context): Promise<CodyResponse> => {
    const config = loadEventEngineConfig(ctx);
    const defs = loadSchemaDefinitions(ctx);
    let successDetails = 'Checklist\n\n';

    if(isCodyError(config)) {
        return config;
    }

    if(isCodyError(defs)) {
        return defs;
    }

    const metadata = extractUiMetadata(ui);

    if(isCodyError(metadata)) {
        return metadata;
    }

    ui = mergeWithSimilarNodes(ui, ctx.syncedNodes);

    const inputData = getSourcesOfType(ui, NodeType.document, true, true, true);

    if(isCodyError(inputData)) {
        return inputData;
    }

    if(inputData.count() === 0) {
        return {
            cody: `UI ${ui.getName()} has no Information card connected.`,
            details: `With the help of an Information card (the green one) I know which data should be displayed on the view page`,
            type: CodyResponseType.Error
        }
    }

    const commands = getTargetsOfType(ui, NodeType.command, true, true, true);

    const fileDescriptions: FileDescription[] = [];
    let componentsImports = '';
    const components: string[] = [];
    const actions: string[] = [];
    const pageName = nodeNameToPascalCase(ui);
    let routePropsForward = '';

    for (const prop of metadata.routeParams) {
        routePropsForward = routePropsForward + (prop.type === 'number'? ` ${prop.name}={Number(props.match.params.${prop.name})}` : ` ${prop.name}={props.match.params.${prop.name}}` )
    }

    const handledInputs: Node[] = [];

    for(const input of inputData) {
        if(handledInputs.find(h => h.getType() === input.getType() && h.getName() === input.getName())) {
            // Do not handle same input twice
            continue;
        }

        const fileDesc = await compileComponentForInputType(input, ui, metadata, defs, config, ctx);

        if(isCodyError(fileDesc) || isCodyWarning(fileDesc)) {
            return fileDesc;
        }

        const voName = nodeNameToPascalCase(input);
        fileDescriptions.push(fileDesc);
        componentsImports = componentsImports + `import ${voName} from "../components/${voName}";\n`;
        components.push(`
            <Grid item={true} xs={12}>
                <${voName}${routePropsForward} />
            </Grid>`);

        handledInputs.push(input);
    }

    for(const command of commands) {
        const cmdName = nodeNameToPascalCase(command);
        let cmdPropsForward = '';

        if(!fs.existsSync(ctx.feFolder + `/components/${cmdName}.tsx`)) {
            continue;
        }

        if(metadata.routeParams && metadata.routeParams.length > 0) {
            const cmdArIdentifier = aggregateIdentifierForCommand(command, config, defs);
            for (const prop of metadata.routeParams) {
                if(cmdArIdentifier && prop.name === cmdArIdentifier) {
                    const cmdArType = aggregateTypeForCommand(command, config, defs);
                    const cmdArIdentifierType = cmdArType? aggregateIdentifierType(cmdArType, cmdArIdentifier, defs) : 'string';

                    cmdPropsForward = cmdPropsForward + (cmdArIdentifierType === 'number'? ` ${prop.name}={Number(props.match.params.${prop.name})}` : ` ${prop.name}={props.match.params.${prop.name}}` )
                }
            }
        }

        componentsImports = componentsImports + `import ${cmdName} from "../components/${cmdName}";\n`;
        actions.push(`                        <${cmdName}${cmdPropsForward} />`);
    }

    const pageContent = compilePage(pageName, metadata.routeParams, componentsImports, components, actions);

    const pageFile = ctx.feFolder+`/pages/${pageName}Page.tsx`;

    if(shouldIgnoreFile(pageFile)) {
        successDetails = successDetails + `⏩️ Skipped ${pageFile} due to // @cody-ignore\n`;
    } else {
        const pageWriteErr = writeFileSync(pageFile, pageContent);

        if(isCodyError(pageWriteErr)) {
            return pageWriteErr;
        }

        successDetails = successDetails + `✔️ React page file ${pageFile} written\n`;
    }


    const configErr = upsertPageConfig(
        config,
        ctx,
        metadata.route,
        pageName + 'Page',
        metadata.topLevel,
        metadata.topLevel? metadata.menuIcon : undefined,
        metadata.topLevel? metadata.menuLabel : undefined,
        metadata.breadcrumbLabel? metadata.breadcrumbLabel : undefined,
        metadata.routeParams? metadata.routeParams : undefined,
    );

    if(isCodyError(configErr)) {
        return configErr;
    }

    successDetails = successDetails + `✔️ React page registered in event-engine.json\n`;

    const routesErr = refreshRoutes(config, ctx);
    if(isCodyError(routesErr)) {
        return routesErr;
    }

    const sidebarErr = refreshSidebar(config, ctx);
    if(isCodyError(sidebarErr)) {
        return sidebarErr;
    }

    const breadcrumbsErr = refreshBreadcrumbsProviders(config, ctx);
    if(isCodyError(breadcrumbsErr)) {
        return breadcrumbsErr;
    }

    const appIndexErr = refreshAppIndex(config, ctx);
    if(isCodyError(appIndexErr)) {
        return appIndexErr;
    }

    return writeMultipleFilesWithOverrideCheck(fileDescriptions, successDetails, `Page for "${ui.getName()}" successfully added to the app.`, ctx);
}

const compileComponentForInputType = async (document: Node, ui: Node, uiMetadata: UiMetadata, defs: SchemaDefinitions, config: EngineConfig, ctx: Context): Promise<FileDescription | CodyResponse> => {
    const voName = voNameWithNamespace(document);

    if(isCodyError(voName)) {
        return voName;
    }

    if(isArrayType(voName, defs)) {
        return await compileComponentForArrayType(document, ui, uiMetadata, defs, config, ctx);
    }

    const stateType = await isStateType(voName, defs);

    if(stateType) {
        return await compileComponentForStateType(document, ui, uiMetadata, defs, config, ctx);
    }

    return  {
        cody: `Skipping react component generation for ${document.getName()}.`,
        details: `I can only generate components for array and object types.`,
        type: CodyResponseType.Warning
    }
}

const validateLinkedRefUiWidget = (uiSchema: UiSchema, propPath: string): true | CodyResponse => {
    if(!uiSchema.hasOwnProperty('ui:options')) {
        return {
            cody: `uiSchema for ${propPath} has a LinkedRef widget configured, but corresponding ui:options are missing!`,
            type: CodyResponseType.Error
        }
    }

    const optionsAreValidOrError = validateLinkedReferenceOptions(uiSchema['ui:options'] as {[key: string]: string}, propPath);

    if(isCodyError(optionsAreValidOrError)) {
        return optionsAreValidOrError;
    }

    return true;
}

const validateLinkedReferenceOptions = (options: {[key: string]: string}, propPath: string): true | CodyResponse => {
    if(!options.hasOwnProperty('data')) {
        return {
            cody: `LinkedRef ui:options for ${propPath} is missing a "data" configuration`,
            type: CodyResponseType.Error
        }
    }

    if(!options.hasOwnProperty('targetPage')) {
        return {
            cody: `LinkedRef ui:options for ${propPath} is missing a "targetPage" configuration`,
            type: CodyResponseType.Error
        }
    }

    if(!options.hasOwnProperty('mapping')) {
        return {
            cody: `LinkedRef ui:options for ${propPath} is missing a "mapping" configuration`,
            type: CodyResponseType.Error
        }
    }

    if(!options.hasOwnProperty('display')) {
        return {
            cody: `LinkedRef ui:options for ${propPath} is missing a "display" configuration`,
            type: CodyResponseType.Error
        }
    }

    return true;
}

const extractDynamicRelationsFromUiSchema = (uiSchema: UiSchema, parentPropPath: string): {[statePropPath: string]: ColumnRelation} | CodyResponse => {
    let relations: {[statePropPath: string]: ColumnRelation} = {};

    for (const prop of Object.keys(uiSchema)) {
        if(prop === 'ui:widget' || prop === 'ui:options') {
            continue;
        }

        const propUiSchema = uiSchema[prop];

        if(typeof propUiSchema !== 'object') {
            continue;
        }

        if(propUiSchema['ui:widget'] && propUiSchema['ui:widget'] === 'LinkedRef') {
            if(!propUiSchema.hasOwnProperty('ui:options')) {
                return {
                    cody: `uiSchema for ${parentPropPath + prop} has a LinkedRef widget configured, but corresponding ui:options are missing!`,
                    type: CodyResponseType.Error
                }
            }

            const optionsAreValidOrError = validateLinkedReferenceOptions(propUiSchema['ui:options'], parentPropPath + prop);

            if(isCodyError(optionsAreValidOrError)) {
                return optionsAreValidOrError;
            }

            relations[parentPropPath + prop] = propUiSchema['ui:options'];
        }

        const childPropRelations = extractDynamicRelationsFromUiSchema(propUiSchema, parentPropPath + prop + '.');

        if(isCodyError(childPropRelations)) {
            return childPropRelations;
        }

        relations = {...relations, ...childPropRelations};
    }

    return relations;
}

const extractDynamicRelationsFromDocumentMetadata = (meta: DocumentMetadata): {[statePropPath: string]: ColumnRelation} | CodyResponse => {
    if(!meta.uiSchema) {
        return  {}
    }

    return extractDynamicRelationsFromUiSchema(meta.uiSchema, '');
}

const compileComponentForStateType = async (document: Node, ui: Node, uiMetadata: UiMetadata, defs: SchemaDefinitions, config: EngineConfig, ctx: Context): Promise<FileDescription | CodyResponse> => {
    const imports: string[] = [];
    const dynamicRelationsStr: string[] = [];
    const voName = nodeNameToPascalCase(document);
    const voNameNs = voNameWithNamespace(document);

    if(isCodyError(voNameNs)) {
        return voNameNs;
    }

    const voFile = getVoFile(voNameNs, defs);
    if(isCodyError(voFile)) {
        return voFile;
    }
    const voImportPath = relativeImportPath(ctx.feFolder+'/components', voFile);

    const stateDescFile = getStateDescriptionFile(voNameNs, defs);
    if(isCodyError(stateDescFile)) {
        return stateDescFile;
    }
    const stateDescImportPath = relativeImportPath(ctx.feFolder+'/components', stateDescFile);

    const ownProps: string[] = [];
    let stateCompare = '';
    uiMetadata.routeParams.forEach(param => {
        ownProps.push(param.name + ': ' + param.type + ';');
        stateCompare = stateCompare + ` && ${lcWord(voName)}.${param.name} === props.${param.name}`
    });

    const documentMetadata = extractDocumentMetadata(document);

    if(isCodyError(documentMetadata)) {
        return documentMetadata;
    }

    const dynamicRelations = await extractDynamicRelationsFromDocumentMetadata(documentMetadata);

    if(isCodyError(dynamicRelations)) {
        return dynamicRelations;
    }

    if(Object.keys(dynamicRelations).length > 0) {
        for(const relPath of Object.keys(dynamicRelations)) {
            const relation = dynamicRelations[relPath];

            addToImports(imports, `import {UiSchema} from "@rjsf/core";`)
            addToImports(imports, `import {useDynamicRelation} from "../core/util/hook/useDynamicRelation";`)
            addToImports(imports, `import {fetch${relation.data}} from "../action/fetch${relation.data}";`)
            addToImports(imports, `import {make${relation.data}Selector} from "../selector/${lcWord(relation.data)}Selector";`)
            addToImports(imports, `import {${relation.data}} from "../model/values/${relation.data}";`)
            addToImports(imports, `import {${voName} as StateModel} from "${voImportPath}";`)
            addToImports(imports, `import * as Route from "../routes";`)

            const query = queryPropertyType(relation.data, relation.mapping, config) === 'number'
                ? `{${relation.mapping}: state?.${relPath} || 0}`
                : `{${relation.mapping}: state?.${relPath} || ''}`

            dynamicRelationsStr.push(
`    const [enrichedState] = useDynamicRelation<StateModel, ${relation.data}, ${relation.data} | null>(
        state? [cloneDeepJSON(state)] : [],
        '${relPath}',
        '${relation.mapping}',
        fetch${relation.data}(${query}),
        make${relation.data}Selector(${query}),
        !!state && !!state.${relPath}
    )
    
    if(uiSchema && enrichedState && enrichedState['__${relPath}Relation']) {
        uiSchema.${relPath}['ui:options']!['reference'] = {
            link: Route.make(Route.${lcWord(relation.targetPage)}, {${relation.mapping}: enrichedState.${relPath}}),
            display: enrichedState['__${relPath}Relation'].name
        }
    }
`
            )
        }
    }


    const content = `import * as React from 'react';
import StateView from "../core/components/StateView";
import {useDispatch, useSelector} from "react-redux";
import {useEffect} from "react";
import {makeCommandExecutedSelector} from "../core/selector/commandSelector";
import {${voName}Description} from "${stateDescImportPath}";
import {fetch${voName}} from "../action/fetch${voName}";
import {make${voName}Selector} from "../selector/${lcWord(voName)}Selector";
import {cloneDeepJSON} from "../core/util/cloneDeepJSON";
${imports.join("\n")}

interface OwnProps {
    ${ownProps.join('\n    ')}
}

type ${voName}Props = OwnProps;

const ${voName} = (props: ${voName}Props) => {
    const dispatch = useDispatch();
    const ${lcWord(voName)} = useSelector(make${voName}Selector({...props}));
    const commandsExecuted = useSelector(makeCommandExecutedSelector());
    const state = ${lcWord(voName)}${stateCompare}? ${lcWord(voName)} : undefined;
    
    const description = cloneDeepJSON(${voName}Description);
    ${dynamicRelationsStr.length? 'let uiSchema: UiSchema | undefined = description.uiSchema;':''}

${dynamicRelationsStr.join("\n")}    
    useEffect(() => {
        dispatch(fetch${voName}({...props}));
    }, [dispatch, commandsExecuted]);

    return <StateView description={description} state={state} />
};

export default ${voName};
`;

    const filePath = ctx.feFolder + `/components/${voName}.tsx`;

    return {
        content,
        filePath,
        node: document,
        description: 'react component',
        successMessage: `React component ${filePath} written`
    }
}

const compileComponentForArrayType = async (document: Node, ui: Node, uiMetadata: UiMetadata, defs: SchemaDefinitions, config: EngineConfig, ctx: Context): Promise<FileDescription | CodyResponse> => {
    // 1. Prepare compilation
    const imports: string[] = [];
    const voName = nodeNameToPascalCase(document);
    let RowDataType = `type RowData = ${voName}Item`;
    let useDynamicRelations = '';

    const voNameNs = voNameWithNamespace(document);

    if(isCodyError(voNameNs)) {
        return voNameNs;
    }

    const voFile = getVoFile(voNameNs, defs);
    if(isCodyError(voFile)) {
        return voFile;
    }

    const voImportPath = relativeImportPath(ctx.feFolder+'/components', voFile);

    const linkTargetUi = getTargetUiForInput(document, ui, config);
    if(isCodyError(linkTargetUi)) {
        return linkTargetUi;
    }

    let onTargetLinkClicked = 'console.warn("Link is disabled, because redirect link is unknown for item: ", data);';
    let redirectLogic = '';

    if(linkTargetUi) {
        const targetUiRoute = `${nodeNameToCamelCase(linkTargetUi)}Page`;
        onTargetLinkClicked = 'setRedirectToItem(data);';
        redirectLogic = `{redirctToItem && <Redirect to={Route.make(Route.${targetUiRoute}, redirctToItem as any)} push={true} />}`;
    }

    const metadata = extractDocumentMetadata(document);
    if(isCodyError(metadata)) {
        return metadata;
    }

    const schema = await dereferenceSchema(metadata.schema, defs);

    if(!schema.type || schema.type !== 'array' || !schema.items) {
        return {
            cody: `Cannot compile react component for array type "${document.getName()}".`,
            details: 'JSONSchema is not of type array with an items definition',
            type: CodyResponseType.Error
        }
    }

    const itemSchema = schema.items;

    if(Array.isArray(itemSchema) || !itemSchema.type || itemSchema.type !== 'object' || !itemSchema.properties) {
        return {
            cody: `Cannot compile react component for array type "${document.getName()}".`,
            details: 'The items schema does not define an object with properties',
            type: CodyResponseType.Error
        }
    }

    // 2. Column configuration
    const propToTitle = (prop: string): string => {
        return nodeNameToSnakeCase(prop).split("_").map(w => ucWord(w)).join(" ");
    }

    const columns: UiSchemaTableColumnConfig[] = ((meta: DocumentMetadata) => {
        const cols: UiSchemaTableColumnConfig[] = [];

        if(meta.uiSchema?.table?.columns) {
            meta.uiSchema.table.columns.forEach((col: UiSchemaTableColumn) => {
                if(typeof col === 'string') {
                    cols.push({field: col, title: propToTitle(col)})
                    return;
                }

                if(col.config && col.config.type === ColumnType.relation) {
                    addToImports(imports, `import Link from "../core/components/Link";`);
                    addToImports(imports, `import {useDynamicRelation} from "../core/util/hook/useDynamicRelation";`);
                    addToImports(imports, `import {fetch${col.config.data}} from "../action/fetch${col.config.data}";`)
                    addToImports(imports, `import {make${col.config.data}Selector} from "../selector/${lcWord(col.config.data)}Selector";`)

                    const dataTypeImport = `import {${col.config.data}, ${col.config.data}Item} from "../model/values/${col.config.data}";`;
                    if(!imports.includes(dataTypeImport)) {
                        imports.push(dataTypeImport);
                        RowDataType += ` & {__${col.field}Relation: ${col.config.data}Item}`
                    }

                    useDynamicRelations += `
    rowDataList = useDynamicRelation<${voName}Item, ${col.config.data}Item, ${col.config.data}>(
        rowDataList,
        '${col.field}',
        '${col.config.mapping}',
        fetch${col.config.data}({}),
        make${col.config.data}Selector({})
    );
`
                }

                if(col.config && col.config.type === ColumnType.linearProgress) {
                    addToImports(imports, `import LinearProgressWithLabel from "../core/components/LinearProgressWithLabel";`)
                }

                cols.push(col)
            })
        } else {
            const props = Object.keys(itemSchema.properties);

            props.forEach(prop => {
                cols.push({
                    field: prop,
                    title: propToTitle(prop),
                })
            });
        }


        return cols;
    })(metadata);


    const compiledColumns = columns.reduce((compiled: string, col ) => {
        let renderFunc = '';

        if(col.config && col.config.type === ColumnType.relation) {
            renderFunc += `\n        render: (rowData: RowData) => <Link to={Route.make(Route.${lcWord(col.config.targetPage)}, {${col.config.mapping}: rowData.${col.field}})}>{rowData.__${col.field}Relation?.${col.config.display}}</Link>`
        }

        if(col.config && col.config.type === ColumnType.linearProgress) {
            renderFunc += `\n        render: (rowData: RowData) => <LinearProgressWithLabel variant="determinate" value={rowData.${col.field}} />`
        }

        compiled += `
    {
        field: "${col.field}",
        title: "${col.title}",${renderFunc}
    },`
        return compiled;
    }, `[`) + '\n]';

    // 3. Compile component
    const ownProps: string[] = [];

    uiMetadata.routeParams.forEach(param => ownProps.push(param.name + ': '+param.type+';'));

    const content = `import * as React from 'react';
import {useDispatch, useSelector} from "react-redux";
import {useEffect, useState} from "react";
import MaterialTable from "material-table";
import {tableIcons} from "../material-ui/tableIcons";
import NavigateNext from '@material-ui/icons/NavigateNext';
import {stringifyRowData} from "../core/util/stringifyRowData";
import {makeCommandExecutedSelector} from "../core/selector/commandSelector";
import * as Route from "../routes";
import {Redirect} from "react-router-dom";
import {Card, CardContent, CardHeader, makeStyles, Typography} from "@material-ui/core";
import {make${voName}Selector} from "../selector/${lcWord(voName)}Selector";
import {fetch${voName}} from "../action/fetch${voName}";
import {${voName}Item} from "${voImportPath}";
import {triggerSideBarAnchorsRendered} from "../core/util/triggerSideBarAnchorsRendered";
import {PatchedPagination} from "../core/components/Table/PatchedPagination";
${imports.join("\n")}

const useStyles = makeStyles(theme => ({
    cardHeadline: {
        paddingTop: theme.spacing(6)
    }
}))

interface OwnProps {
    ${ownProps.join('\n    ')}
}

type ${voName}Props = OwnProps;

${RowDataType};

const columns = ${compiledColumns};

const ${voName} = (props: ${voName}Props) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    let rowDataList = useSelector(make${voName}Selector({...props}));
    ${useDynamicRelations}
    const commandsExecuted = useSelector(makeCommandExecutedSelector());
    const [redirctToItem, setRedirectToItem] = useState<${voName}Item|undefined>();

    useEffect(() => {
        dispatch(fetch${voName}({...props}));
    }, [dispatch, commandsExecuted]);
    
    useEffect(() => {
        triggerSideBarAnchorsRendered();
    })
    
    const handleItemClick = (e:     React.MouseEvent, data: ${voName}Item) => {
        ${onTargetLinkClicked}
    }
    
    return <>
        ${redirectLogic}
        {!redirctToItem &&
            <Card>
                <CardHeader title={<Typography variant="h3" className={classes.cardHeadline + " sidebar-anchor"} id="component-${ui.getName()}">${metadata.schema.title || ui.getName()}</Typography>} />
                <CardContent>
                    <MaterialTable
                        icons={tableIcons as any}
                        localization={{
                            header: {actions: ''}
                        }}
                        actions={[
                            {
                                icon: () => <NavigateNext/>,
                                onClick: (e, data) => handleItemClick(e, data as ${voName}Item),
                                disabled: ${linkTargetUi? 'false' : 'true'}
                            }
                        ]}
                        columns={columns}
                        data={stringifyRowData<RowData>(rowDataList, columns.map(col => col.field))}
                        options={{showTitle: false}}
                        components={{
                            Pagination: PatchedPagination,
                        }}
                    />
                </CardContent>
            </Card>}
        </>
};

export default ${voName};
`;

    const filePath = ctx.feFolder + `/components/${voName}.tsx`;

    return {
        content,
        filePath,
        node: document,
        description: 'react component',
        successMessage: `React component ${filePath} written`
    }
}

const compilePage = (pageName: string, routeParams: Array<{name: string, type: string}>, componentsImports: string, components: string[], actions: string[]): string => {
    let actionStr = "";
    let routeParamsStr = "";

    if(actions.length) {
        actionStr = `<Grid item={true} xs={12}>
                <CommandBar>
${actions.join('\n')}
                </CommandBar>
            </Grid>`;
    }

    routeParams.forEach(param => {
        routeParamsStr = routeParamsStr + `    ${param.name}: string;`
    })


    return `import * as React from 'react';
import {Grid} from "@material-ui/core";
import {RouteComponentProps, withRouter} from "react-router";
import CommandBar from "../core/components/CommandBar";
${componentsImports}

interface OwnProps {

}

interface RouteProps {
${routeParamsStr}
}

type ${pageName}PageProps = OwnProps & RouteComponentProps<RouteProps>;

const ${pageName}Page = (props: ${pageName}PageProps) => {
    return (
        <Grid container={true} spacing={3}>
            ${actionStr}
            ${components.join('\n')}
        </Grid>
    );
};

export default withRouter(${pageName}Page);
`;
}

const getTargetUiForInput = (input: Node, mainUi: Node, config: EngineConfig): Node | CodyResponse | null => {
    let targetUiOfInput: Node = mainUi;

    if(!mainUi.getSources().includes(input)) {
        mainUi.getChildren().forEach(child => {
            if(child.getSources().includes(input)) {
                targetUiOfInput = child;
            }
        })
    }

    const targetUis = getTargetsOfTypeWithParentLookup(targetUiOfInput, NodeType.ui);

    if(targetUis.count() === 0) {
        return null;
    }

    if(targetUis.count() > 1) {
        return {
            cody: `I'm looking for the next ÙI card that ${mainUi.getName()} links to from ${input.getName()}`,
            details: `But I can't decide which one is correct, because multiple UIs are connected. You either clean that up or have to implement it yourself. Sorry!`,
            type: CodyResponseType.Error
        }
   }

    return targetUis.first(null);
}
