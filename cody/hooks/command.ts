import {Node, NodeType} from "../src/board/graph";
import {Context} from "./context";
import {CodyHook} from "../src/board/code";
import {CodyResponse, CodyResponseType, isCodyError} from "../src/general/response";
import {lcWord, nodeNameToPascalCase, nodeNameToSnakeCase} from "../src/utils/string";
import {
    AggregateMetadata,
    CommandMetadata,
    DEFAULT_COMMAND_BUTTON,
    extractAggregateMetadata,
    extractCommandMetadata
} from "./utils/metadata";
import {compileSchema, dereferenceSchema} from "./utils/jsonschema";
import {writeFileSync} from "../src/utils/filesystem";
import {getSingleSource, getSingleSourceFromSyncedNodes, getSingleTarget} from "../src/utils/node-traversing";
import {createAggregateModuleIfNotExists} from "./aggregate";
import {loadEventEngineConfig, loadSchemaDefinitions, upsertCommandConfig} from "./utils/config";
import {EngineConfig, SchemaDefinitions} from "./types";
import {aggregateIdentifierType} from "./utils/schemaHelpers";
import {shouldIgnoreFile} from "./utils/file";
import {addIconToImports, addToImports} from "./utils/templateHelpers";
import {onUiHook} from "./ui";

export const onCommandHook: CodyHook<Context> = async (command: Node, ctx: Context): Promise<CodyResponse> => {

    const cmdName = nodeNameToPascalCase(command);
    const cmdFilename = cmdName+'.ts';
    const metadata = extractCommandMetadata(command);
    const config = loadEventEngineConfig(ctx);
    const defs = loadSchemaDefinitions(ctx);
    let successDetails = 'Checklist\n\n';

    if(isCodyError(metadata)) {
        return metadata;
    }

    if(isCodyError(config)) {
        return config;
    }

    if(isCodyError(defs)) {
        return defs;
    }

    const aggregate = getSingleTarget(command, NodeType.aggregate);
    if(isCodyError(aggregate)) {
        return aggregate;
    }

    const aggregateMetadata = extractAggregateMetadata(aggregate);
    if(isCodyError(aggregateMetadata)) {
        return aggregateMetadata;
    }

    const aggregateType = nodeNameToPascalCase(aggregate);
    const aggregateDir = await createAggregateModuleIfNotExists(aggregate, ctx);

    if(isCodyError(aggregateDir)) {
        return aggregateDir;
    }

    successDetails = successDetails + `✔️ Aggregate module ${aggregateDir} prepared\n`;

    const cmdDir = aggregateDir + '/commands';
    const cmdFile = cmdDir + `/${cmdFilename}`;

    try {
        const content = await compileSchema(metadata.schema, cmdName, cmdFile, defs, `export const ${nodeNameToSnakeCase(cmdName).toUpperCase()} = '${cmdName}'`);

        if(shouldIgnoreFile(cmdFile)) {
            successDetails = successDetails + `⏩️ Skipped ${cmdFile} due to // @cody-ignore\n`;
        } else {
            const writeFileErr = writeFileSync(cmdFile, content);

            if(writeFileErr) {
                return writeFileErr;
            }

            successDetails = successDetails + `✔️ Command file ${cmdFile} written\n`;
        }


    } catch (reason) {
        return {
            cody: `I was not able to compile schema of command ${command.getName()}`,
            details: reason.toString(),
            type: CodyResponseType.Error
        };
    }

    const descriptionContent = await compileCommandDescription(cmdName, metadata, aggregateMetadata, config, defs, ctx);
    if(isCodyError(descriptionContent)) {
        return descriptionContent;
    }

    const descriptionFilename = `${cmdName}Description.ts`;
    const descriptionFile = cmdDir + `/${descriptionFilename}`;

    if(shouldIgnoreFile(descriptionFile)) {
        successDetails = successDetails + `⏩️ Skipped ${descriptionFile} due to // @cody-ignore\n`;
    } else {
        const descErr = writeFileSync(descriptionFile, descriptionContent);
        if(isCodyError(descErr)) {
            return descErr;
        }

        successDetails = successDetails + `✔️ Command description ${descriptionFile} written\n`;
    }


    const componentContent = await compileCommandReactComponent(cmdName, metadata, aggregateMetadata, config, defs, ctx);
    if(isCodyError(componentContent)) {
        return componentContent;
    }

    const componentFilename = `${cmdName}.tsx`;

    const componentFile = ctx.feFolder + `/components/${componentFilename}`;

    if(shouldIgnoreFile(componentFile)) {
        successDetails = successDetails + `⏩️ Skipped ${componentFile} due to // @cody-ignore\n`;
    } else {
        const componentErr = writeFileSync(componentFile, componentContent);
        if(isCodyError(componentErr)) {
            return componentErr;
        }

        successDetails = successDetails + `✔️ Command React component ${componentFile} written\n`;
    }


    const cmdConfigErr = upsertCommandConfig(cmdName, aggregateType, command.getLink(), metadata, config, ctx);

    if(isCodyError(cmdConfigErr)) {
        return cmdConfigErr;
    }

    successDetails = successDetails + `✔️ Command ${cmdName} added to event-engine.json\n`;

    // Answer cody questions with no
    ctx.silent = true;
    await updateUiIfConnected(command, ctx);

    return {
        cody: `Wasn't easy, but command ${cmdName} should work now!`,
        details: ['%c'+successDetails, 'color: #73dd8e;font-weight: bold'],
    }
}

const compileCommandDescription =  async (commandName: string, metadata: CommandMetadata, aggregateMetadata: AggregateMetadata, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): Promise<CodyResponse | string> => {
    const schema = await dereferenceSchema(metadata.schema, defs);

    return `import {UiSchema} from "@rjsf/core";
import {CommandDescription} from "../../../core/types";

export const ${commandName}Schema = ${JSON.stringify(schema, null, 2)};

export const ${commandName}Description: CommandDescription = {
    commandName: "${commandName}",
    schema: ${commandName}Schema,
    aggregateType: "${aggregateMetadata.aggregateType}",
    aggregateIdentifier: "${aggregateMetadata.identifier}",
    createAggregate: ${metadata.newAggregate? 'true' : 'false'},
    ${metadata.uiSchema? 'uiSchema: ' + JSON.stringify(metadata.uiSchema) + ',' : ''}
};
`;
}

const compileCommandReactComponent = async (cmdName: string, metadata: CommandMetadata, aggregateMetadata: AggregateMetadata, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): Promise<CodyResponse | string> => {
    let ownProps = '';
    let aggregateIdentifierForward = '';
    let aggregateStateForward = '';
    let loadAggregateSate = '';
    let aggregateStateCompare = '';
    let commandDescVariable = cmdName + 'Description';
    let additionalImports: string[] = [];
    let buttonComponent = DEFAULT_COMMAND_BUTTON;
    let forwardButtonProps = "";
    const extendSchema = compileSchemaExtension(cmdName, metadata, config, defs, ctx);

    if(isCodyError(extendSchema)) {
        return extendSchema;
    }

    if(extendSchema.extendStr.length > 0) {
        commandDescVariable = 'description';
        additionalImports = extendSchema.imports;
    }

    if(!metadata.newAggregate) {
        ownProps = `${aggregateMetadata.identifier}: ${aggregateIdentifierType(aggregateMetadata.aggregateType, aggregateMetadata.identifier, defs)};`;
        aggregateIdentifierForward = `aggregateIdentifier={{identifier: "${aggregateMetadata.identifier}", value: props.${aggregateMetadata.identifier}}}`;

        const arType = aggregateMetadata.aggregateType;

        additionalImports.push(`import {useSelector} from "react-redux";`);
        additionalImports.push(`import {make${arType}Selector} from "../selector/${lcWord(arType)}Selector";`);

        loadAggregateSate = `const ${lcWord(arType)} = useSelector(make${arType}Selector({...props}));`
        aggregateStateCompare = `const state = ${lcWord(arType)}? ${lcWord(arType)} : undefined; `
        aggregateStateForward = `aggregateState={state}`
    }

    const defaultCmdBtnImport = `import CommandButton from "../core/components/CommandButton";`;

    if(metadata.uiButton) {
        if(metadata.uiButton.component === DEFAULT_COMMAND_BUTTON) {
            addToImports(additionalImports, defaultCmdBtnImport);
        } else {
            addToImports(additionalImports,`import ${metadata.uiButton.component} from "./${metadata.uiButton.component}"; `);
            buttonComponent = metadata.uiButton.component;
            forwardButtonProps = `${aggregateIdentifierForward} ${aggregateStateForward} `;
        }

        if(metadata.uiButton.icon) {
            addIconToImports(additionalImports, metadata.uiButton.icon);
            forwardButtonProps += `startIcon={<${metadata.uiButton.icon}Icon />} `
        }
    } else {
        addToImports(additionalImports, defaultCmdBtnImport);
    }

    return `import * as React from 'react';
import {${cmdName}Description} from "../model/${aggregateMetadata.aggregateType}/commands/${cmdName}Description";
import CommandDialog from "../core/components/CommandDialog";
import {useState} from "react";
${additionalImports.reduce((prev, current) => prev += `\n${current}`, '')}

interface OwnProps {
    ${ownProps}
}

type ${cmdName}Props = OwnProps;

const ${cmdName} = (props: ${cmdName}Props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    ${loadAggregateSate}
    ${aggregateStateCompare}
    ${extendSchema.extendStr}
    const handleOpenDialog = () => {setDialogOpen(true)};
    const handleCloseDialog = () => {setDialogOpen(false)};

    return <>
        <${buttonComponent} command={${cmdName}Description} onClick={handleOpenDialog} ${forwardButtonProps}/>
        <CommandDialog 
            open={dialogOpen} 
            onClose={handleCloseDialog} 
            commandDialogCommand={${commandDescVariable}} 
            ${aggregateIdentifierForward}
            ${aggregateStateForward}
        />
    </>
};

export default ${cmdName};    
`;
}

const compileSchemaExtension = (cmdName: string, metadata: CommandMetadata, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): {extendStr: string, imports: string[]} | CodyResponse => {
    const emptyResult = {extendStr: '', imports: []};

    if(!metadata.uiSchema) {
        return emptyResult;
    }

    let extendSchema = '';
    const imports: string[] = [];
    const schemaInit = `let newSchema = ${cmdName}Description.schema;`

    for(const cmdProperty of Object.keys(metadata.uiSchema)) {
        const uiSchema = metadata.uiSchema[cmdProperty];

        if (typeof uiSchema !== 'object') {
            continue
        }

        if (!Object.keys(uiSchema).includes('ui:widget')) {
            continue
        }

        if (uiSchema['ui:widget'] !== 'DynamicEnum') {
            continue
        }

        if (!Object.keys(uiSchema).includes('ui:options')) {
            return {
                cody: "Missing ui:options for uiSchema DynamicEnum of " + cmdName,
                details: "ui:options should contain 'data' and 'mapping' information for DynamicEnum"
            }
        }

        const uiOptions = uiSchema['ui:options'];

        if(typeof uiOptions !== 'object') {
            return {
                cody: "ui:options for uiSchema DynamicEnum of " + cmdName + " is not an object!",
                details: "ui:options should contain 'data' and 'mapping' information for DynamicEnum"
            }
        }

        if (!Object.keys(uiOptions).includes('data')) {
            return {
                cody: "Missing ui:options.data for uiSchema DynamicEnum of " + cmdName,
                details: "ui:options should contain 'data' and 'mapping' information for DynamicEnum"
            }
        }

        if (typeof uiOptions['data'] !== 'string') {
            return {
                cody: "ui:options.data for uiSchema DynamicEnum of " + cmdName + " is not a string",
                details: "ui:options should contain 'data' and 'mapping' information for DynamicEnum"
            }
        }

        if (!Object.keys(uiOptions).includes('mapping')) {
            return {
                cody: "Missing ui:options.mapping for uiSchema DynamicEnum of " + cmdName,
                details: "ui:options should contain 'data' and 'mapping' information for DynamicEnum"
            }
        }

        if(extendSchema === '') {
            extendSchema = "\n    " + schemaInit;
            imports.push(`import {useDynamicEnum} from "../core/util/hook/useDynamicEnum";`)
        }

        const data = uiOptions['data'];
        const queryImport = `import {fetch${data}} from "../action/fetch${data}";`;
        if(!imports.includes(queryImport)) {
            imports.push(queryImport);
        }
        const selectorImport = `import {make${data}Selector} from "../selector/${lcWord(data)}Selector";`;
        if(!imports.includes(selectorImport)) {
            imports.push(selectorImport);
        }

        extendSchema += `
    newSchema = useDynamicEnum(
        newSchema,
        '${cmdProperty}',
        fetch${data}({}),
        make${data}Selector({}),
        ${JSON.stringify(uiOptions['mapping'])}
    );
    `;
    }

    if(extendSchema !== '') {
        extendSchema += `
    const description = {
        ...${cmdName}Description,
        schema: newSchema,
    };
    `;
    }

    return {
        extendStr: extendSchema,
        imports,
    };
}

const updateUiIfConnected = async (command: Node, ctx: Context): Promise<CodyResponse> => {
    const ui = getSingleSourceFromSyncedNodes(command, NodeType.ui, ctx.syncedNodes);

    if(isCodyError(ui)) {
        console.error("Failed to update UI for command " + command.getName(), ui);
        return ui;
    }

    const response = await onUiHook(ui, ctx);

    if(isCodyError(response)) {
        console.error("Failed to update UI for command " + command.getName(), response);
    }

    return response;
}
