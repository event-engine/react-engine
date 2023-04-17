import {CodyHook} from "../src/board/code";
import {Context} from "./context";
import {Node, NodeType} from "../src/board/graph";
import {CodyResponse, CodyResponseType, isCodyError} from "../src/general/response";
import {nodeNameToSnakeCase} from "../src/utils/string";
import {EventMetadata, extractEventMetadata} from "./utils/metadata";
import {getSingleSource} from "../src/utils/node-traversing";
import {
    getAggregateType,
    loadEventEngineConfig, loadSchemaDefinitions,
    messageName,
    upsertAggregateEventConfig,
} from "./utils/config";
import {createAggregateModuleIfNotExists} from "./aggregate";
import {compileSchema} from "./utils/jsonschema";
import {writeFileSync} from "../src/utils/filesystem";
import {EngineConfig, SchemaDefinitions} from "./types";
import {shouldIgnoreFile} from "./utils/file";

export const onEventHook: CodyHook<Context> = async (event: Node, ctx: Context): Promise<CodyResponse> => {
    const evtName = messageName(event, ctx);
    const metadata = extractEventMetadata(event);

    const config = loadEventEngineConfig(ctx);
    const defs = loadSchemaDefinitions(ctx);

    if(isCodyError(metadata)) {
        return metadata;
    }

    if(isCodyError(config)) {
        return config;
    }

    if(isCodyError(defs)) {
        return defs;
    }

    const aggregate = getSingleSource(event, NodeType.aggregate);

    if(isCodyError(aggregate)) {
        if(config.events.hasOwnProperty(evtName) && config.events[evtName].aggregateType) {
            return {
                cody: `Skipped event ${evtName}.`,
                details: 'Looks like an aggregate event produced elsewhere.'
            }
        }

        return {
            cody: `Skipped event ${evtName}.`,
            details: 'Looks like public event not relevant for the UI.'
        }
    }

    return compileAggregateEvent(event, metadata, aggregate, config, defs, ctx);
}

const compileAggregateEvent = async (event: Node, metadata: EventMetadata, aggregate: Node, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): Promise<CodyResponse> => {
    const aggregateType = getAggregateType(aggregate, ctx);
    const aggregateDir = await createAggregateModuleIfNotExists(aggregate, ctx);
    const evtName = messageName(event, ctx);
    const evtFilename = evtName + '.ts';
    let successDetails = 'Checklist\n\n';

    if(isCodyError(aggregateDir)) {
        return aggregateDir;
    }

    successDetails = successDetails + `✔️ Aggregate module ${aggregateDir} prepared\n`;

    const evtDir = aggregateDir + '/events';
    const evtFile = evtDir + `/${evtFilename}`

    try {
        const content = await compileSchema(metadata.schema, evtName, evtFile, defs, `export const ${nodeNameToSnakeCase(event).toUpperCase()} = '${evtName}'`);

        if(shouldIgnoreFile(evtFile)) {
            successDetails = successDetails + `⏩️ Skipped ${evtFile} due to // @cody-ignore\n`;
        } else {
            const writeFileErr = writeFileSync(evtFile, content);

            if(writeFileErr) {
                return writeFileErr;
            }

            successDetails = successDetails + `✔️ Event file ${evtFile} written\n`;
        }

    } catch (reason) {
        return {
            cody: `I was not able to compile schema of event ${event.getName()}`,
            details: reason.toString(),
            type: CodyResponseType.Error
        };
    }

    const evtConfigErr = upsertAggregateEventConfig(evtName, aggregateType, event.getLink(), metadata, config, ctx);

    if(isCodyError(evtConfigErr)) {
        return evtConfigErr;
    }

    successDetails = successDetails + `✔️ Event ${evtName} added to event-engine.json\n`;

    return {
        cody: `Event ${evtName} is added to the app!`,
        details: ['%c'+successDetails, 'color: #73dd8e;font-weight: bold'],
    }
}
