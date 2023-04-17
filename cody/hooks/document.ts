import fs from "fs";
import {CodyHook} from "../src/board/code";
import {Node, NodeType} from "../src/board/graph";
import {CodyResponse, CodyResponseType, isCodyError} from "../src/general/response";
import {mkdirIfNotExistsSync, writeFileSync} from "../src/utils/filesystem";
import {getSourcesOfType} from "../src/utils/node-traversing";
import {lcWord, nodeNameToPascalCase, nodeNameToSnakeCase, voNameWithNamespace} from "../src/utils/string";
import {EngineConfig, SchemaDefinitions} from "./types";
import {Context} from "./context";
import {
    loadEventEngineConfig, loadSchemaDefinitions,
    messageName,
    upsertQueryConfig,
    upsertSagaConfig,
    upsertSchemaDefinitionConfig
} from "./utils/config";
import {compileSchema, dereferenceSchema, isArrayType, relativeImportPath} from "./utils/jsonschema";
import {DocumentMetadata, extractDocumentMetadata} from "./utils/metadata";
import {refreshRootSagaFile} from "./utils/refreshRootSagaFile";
import {overrideFileDetails} from "./utils/response";
import {refreshRootReducerFile} from "./utils/refreshRootReducerFile";
import {shouldIgnoreFile} from "./utils/file";

export const onDocumentHook: CodyHook<Context> = async (document: Node, ctx: Context): Promise<CodyResponse> => {
    const metadata = extractDocumentMetadata(document);
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

    const voName = nodeNameToPascalCase(document);

    let namespace = metadata.namespace || '/';

    if(namespace.charAt(0) !== "/") {
        namespace = "/" + namespace;
    }

    const dirNamespace = namespace.length === 1? '' : namespace;
    const voNameWithNs = namespace.length === 1? '/' + voName : namespace + '/' + voName;

    const voFilename = `${voName}.ts`;

    const voDir = ctx.feFolder + `/model/values${dirNamespace}`;

    mkdirIfNotExistsSync(voDir, {recursive: true});

    const voFile = ctx.feFolder + `/model/values${dirNamespace}/${voFilename}`;

    let successDetails = 'Checklist\n\n';

    const schemaDefErr = upsertSchemaDefinitionConfig(voNameWithNs, voFile, metadata.schema, defs, ctx);

    if(isCodyError(schemaDefErr)) {
        return schemaDefErr;
    }

    successDetails = successDetails + `✔️ Value Object schema added to schema-definitions.json\n`;

    try {
        const content = await compileSchema(metadata.schema, voName, voFile, defs);

        if(shouldIgnoreFile(voFile)) {
            successDetails = successDetails + `⏩️ Skipped ${voFile} due to // @cody-ignore\n`;
        } else {
            const writeFileErr = writeFileSync(voFile, content);

            if(writeFileErr) {
                return writeFileErr;
            }

            successDetails = successDetails + `✔️ Value Object file ${voFile} written\n`;
        }

    } catch (reason) {
        return {
            cody: `I was not able to compile schema of value object ${document.getName()}`,
            details: reason.toString(),
            type: CodyResponseType.Error
        };
    }

    const stateIdentifier = await determineStateIdentifierIfAggregateStateIsReferenced(document, config, defs, ctx);
    if(isCodyError(stateIdentifier)) {
        return stateIdentifier;
    }

    if(stateIdentifier) {
        const descContent = await compileStateDescription(document, metadata, stateIdentifier, dirNamespace, config, defs, ctx);
        if(isCodyError(descContent)) {
            return descContent;
        }

        const voDescFilename = `${voName}.desc.ts`;
        const voDescFile = ctx.feFolder + `/model/values${dirNamespace}/${voDescFilename}`;

        if(shouldIgnoreFile(voDescFile)) {
            successDetails = successDetails + `⏩️ Skipped ${voDescFile} due to // @cody-ignore\n`;
        } else {
            const descWriteErr = writeFileSync(voDescFile, descContent);
            if(isCodyError(descWriteErr)) {
                return descWriteErr;
            }

            successDetails = successDetails + `✔️ State description file ${voDescFile} written\n`;
        }

    }


    const successResponse = (): CodyResponse => {
        return {
            cody: `"${document.getName()}" is now available.`,
            details: ['%c'+successDetails, 'color: #73dd8e;font-weight: bold'],
        }
    }

    if(metadata.querySchema) {
        const queryConfigErr = upsertQueryConfig(voName, document.getLink(), metadata.querySchema, metadata.schema, config, ctx);

        if(isCodyError(queryConfigErr)) {
            return queryConfigErr;
        }

        const sagaConfigErr = upsertSagaConfig(`fetch${voName}Flow`, config, ctx);

        if(isCodyError(sagaConfigErr)) {
            return sagaConfigErr;
        }

        successDetails = successDetails + `✔️ Query ${voName} added to event-engine.json\n`;

        const queryFile = ctx.feFolder + `/api/queries/Fetch${voFilename}`;
        const sagaFile = ctx.feFolder + `/saga/fetch${voName}Flow.ts`;

        try {
            const content = await compileSchema(metadata.querySchema, 'Fetch'+voName, queryFile, defs);

            if(shouldIgnoreFile(queryFile)) {
                successDetails = successDetails + `⏩️ Skipped ${queryFile} due to // @cody-ignore\n`;
            } else {
                const writeFileErr = writeFileSync(queryFile, content);

                if(writeFileErr) {
                    return writeFileErr;
                }

                successDetails = successDetails + `✔️ Query file ${queryFile} written\n`;
            }

        } catch (reason) {
            return {
                cody: `I was not able to compile schema of query for ${document.getName()}`,
                details: reason.toString(),
                type: CodyResponseType.Error
            };
        }

        const refreshSagaErr = refreshRootSagaFile(config, ctx);
        if(isCodyError(refreshSagaErr)) {
            return refreshSagaErr;
        }

        const successDetailsOrErr = compileAndWriteQueryActions(document, voName, voFile, ctx, successDetails);
        if(isCodyError(successDetailsOrErr)) {
            return successDetailsOrErr;
        }

        successDetails = successDetailsOrErr;

        const reducerContent = compileQueryReducer(document, voName, voFile, config, defs, ctx);
        if(isCodyError(reducerContent)) {
            return reducerContent;
        }

        const reducerFile = ctx.feFolder+`/reducer/${lcWord(voName)}Reducer.ts`;

        if(shouldIgnoreFile(reducerFile)) {
            successDetails = successDetails + `⏩️ Skipped ${reducerFile} due to // @cody-ignore\n`;
        } else {
            const reducerFileErr = writeFileSync(reducerFile, reducerContent);
            if(isCodyError(reducerFileErr)) {
                return reducerFileErr;
            }

            const refreshReducerErr = refreshRootReducerFile(config, ctx);
            if(isCodyError(refreshReducerErr)) {
                return refreshReducerErr;
            }

            successDetails = successDetails + `✔️ Reducer file ${reducerFile} written\n`;
        }


        const selectorContent = compileQuerySelector(document, voName, voFile, config, defs, ctx);
        if(isCodyError(selectorContent)) {
            return selectorContent;
        }

        const selectorFile = ctx.feFolder+`/selector/${lcWord(voName)}Selector.ts`;

        if(shouldIgnoreFile(selectorFile)) {
            successDetails = successDetails + `⏩️ Skipped ${selectorFile} due to // @cody-ignore\n`;
        } else {
            const selectorFileErr = writeFileSync(selectorFile, selectorContent);
            if(isCodyError(selectorFileErr)) {
                return selectorFileErr;
            }

            successDetails = successDetails + `✔️ Selector file ${selectorFile} written\n`;
        }


        const sagaContent = compileQuerySaga(document, voName, voFile, config, defs, ctx);

        if(isCodyError(sagaContent)) {
            return sagaContent;
        }

        const writeSagaFile = (): CodyResponse | null => {
            successDetails = successDetails + `✔️ Query saga file ${sagaFile} written\n`;
            return writeFileSync(sagaFile, sagaContent);
        }

        const fileExists = fs.existsSync(sagaFile);

        if(!fileExists) {
            const wfErr = writeSagaFile();

            if(isCodyError(wfErr)) {
                return wfErr;
            }

            return successResponse();
        } else {
            if(shouldIgnoreFile(sagaFile)) {
                successDetails = successDetails + `⏩️ Skipped ${sagaFile} due to // @cody-ignore\n`;
                return successResponse();
            }

            return {
                cody: `Oh, I think there is already a saga file for query "${document.getName()}"`,
                details: overrideFileDetails(sagaFile),
                type: CodyResponseType.Question,
                reply: (override: string): Promise<CodyResponse> => {
                    return new Promise<CodyResponse>(resolve1 => {
                        if(override === 'yes' || override === 'y') {
                            const wfErr = writeSagaFile();

                            if(isCodyError(wfErr)) {
                                resolve1(wfErr);
                                return;
                            }

                            resolve1(successResponse());
                        } else {
                            resolve1({
                                cody: `Good choice, I'm skipping reducer function for "${document.getName()}"`,
                                details: ["Save is save!\n\n%c" + successDetails, 'color: #73dd8e;font-weight: bold'],
                                type: CodyResponseType.Info
                            })
                        }
                    })
                }
            }
        }
    }

    return successResponse();
}

enum QueryType {
    AggregateState = 'AggregateState',
    ReadModel = 'ReadModel'
}

const determineQueryType = (query: Node): QueryType => {
    const events = getSourcesOfType(query, NodeType.event);

    if(isCodyError(events)) {
        // If query has no (or not only) events as source, we assume it's for a read model
        return QueryType.ReadModel;
    }

    return QueryType.AggregateState;
}

const determineAggregateState = (query: Node, config: EngineConfig, defs: SchemaDefinitions): string | CodyResponse => {
    const events = getSourcesOfType(query, NodeType.event);

    if(isCodyError(events)) {
        return events;
    }

    const firstEvent = events.first() as Node;
    const evtName = nodeNameToPascalCase(firstEvent);

    if(!config.events.hasOwnProperty(evtName)) {
        return {
            cody: `Was looking for aggregate state returned by query ${query.getName()}, but I can't determine the correct state.`,
            details: `The first event connected to the query is ${firstEvent.getName()}, but it is not registered in event-engine.json`,
            type: CodyResponseType.Error
        }
    }

    const aggregateState = config.events[evtName].aggregateType + 'State';

    if(!defs.sourceMap.hasOwnProperty(aggregateState)) {
        return {
            cody: `I looked up ${aggregateState} being the aggregate state returned by query ${query.getName()}, but the state is not registered in the source map of schema-definitions.json`,
            details: `Without the source map I cannot write a proper resolver for the query. Did you add the aggregate manually and missed adding its state in the schema definition file?`,
            type: CodyResponseType.Error
        }
    }

    return aggregateState;
}

const compileAndWriteQueryActions = (query: Node, voName: string, voFile: string, ctx: Context, successDetails: string): string | CodyResponse => {
    const queryActionFilename = `fetch${voName}`;
    const eventActionFilename = `${lcWord(voName)}Fetched`;
    const queryActionFile = ctx.feFolder + `/action/${queryActionFilename}.ts`;
    const eventActionFile = ctx.feFolder + `/action/${eventActionFilename}.ts`;
    const voImportPath = relativeImportPath(ctx.feFolder + '/action', voFile);

    const queryActionContent = `import {createAction} from 'redux-actions';
import {Fetch${voName}} from "../api/queries/Fetch${voName}";

export const fetch${voName} = createAction<Fetch${voName}>('FETCH_${nodeNameToSnakeCase(voName).toUpperCase()}');
`;

    if(shouldIgnoreFile(queryActionFile)) {
        successDetails = successDetails + `⏩️ Skipped ${queryActionFile} due to // @cody-ignore\n`;
    } else {
        const queryActionErr = writeFileSync(queryActionFile, queryActionContent);

        if(isCodyError(queryActionErr)) {
            return queryActionErr;
        }

        successDetails = successDetails + `✔️ Query action file ${queryActionFile} written\n`;
    }



    const eventActionContent = `import {createAction} from "redux-actions";
import {${voName}} from "${voImportPath}";

export const ${eventActionFilename} = createAction<${voName}>('${nodeNameToSnakeCase(voName).toUpperCase()}_FETCHED');
`;

    if(shouldIgnoreFile(eventActionFile)) {
        successDetails = successDetails + `⏩️ Skipped ${eventActionFile} due to // @cody-ignore\n`;
    } else {
        const eventActionErr = writeFileSync(eventActionFile, eventActionContent);

        if(isCodyError(eventActionErr)) {
            return eventActionErr;
        }

        successDetails = successDetails + `✔️ Event action file ${eventActionFile} written\n`;
    }



    return successDetails;
}

const compileQuerySaga = (query: Node, voName: string, voFile: string, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): string | CodyResponse => {
    const eventActionFunc = `${voName.charAt(0).toLowerCase() + voName.slice(1)}Fetched`;
    const voImportPath = relativeImportPath(ctx.feFolder + '/saga', voFile);

    return `import {call, fork, put, take} from 'redux-saga/effects';
import {fetch${voName}} from "../action/fetch${voName}";
import {Action} from "redux-actions";
import {Fetch${voName}} from "../api/queries/Fetch${voName}";
import {${voName}} from "${voImportPath}";
import {Api} from "../core/api";
import {onEnqueueErrorSnackbar} from "../core/saga/enqueueSnackbarFlow";
import {AxiosResponse} from "axios";
import {${eventActionFunc}} from "../action/${eventActionFunc}";

function* onFetch${voName}(query: Fetch${voName}) {
    try {
        const result: AxiosResponse<${voName}> = yield call(Api.executeQuery, 'Get${voName}', query);

        if(result.status === 200) {
            yield put(${eventActionFunc}(result.data));
        } else {
            yield call(
                onEnqueueErrorSnackbar,
                \`Executing query Fetch${voName} failed. Take a look at your browser console for details.\`,
                6000,
            );
        }
    } catch (e) {
        yield call(
            onEnqueueErrorSnackbar,
            \`Executing query Fetch${voName} failed. Take a look at your browser console for details.\`,
            6000,
        );
    }
}

export function* fetch${voName}Flow() {
    while (true) {
        const query: Action<Fetch${voName}> = yield take(fetch${voName}.toString());

        yield fork(onFetch${voName}, query.payload);
    }
}
`;
}

const compileQueryReducer = (query: Node, voName: string, voFile: string, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): string | CodyResponse => {
    const voNameNs = voNameWithNamespace(query);

    if(isCodyError(voNameNs)) {
        return voNameNs;
    }

    const eventActionFunc = `${lcWord(voName)}Fetched`;
    const voImportPath = relativeImportPath(ctx.feFolder + '/saga', voFile);
    const arrayType = isArrayType(voNameNs, defs);
    const stateType = arrayType? voName : voName + ' | null';
    const initialState = arrayType? '= []' : '= null';

    return `import {${voName}} from "${voImportPath}";
import {Action, handleActions} from "redux-actions";
import {${eventActionFunc}} from "../action/${eventActionFunc}";

export type ${voName}State = ${stateType};

export const initialState: ${voName}State ${initialState};

export const reducer = handleActions<${voName}State, any>(
    {
        [${eventActionFunc}.toString()]: (state = initialState, action: Action<${voName}>) => {
            if(state === undefined) {
                return state;
            }

            return action.payload;
        }
    },
    initialState
)    
`;
}

const compileQuerySelector = (query: Node, voName: string, voFile: string, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): string | CodyResponse => {
    const voImportPath = relativeImportPath(ctx.feFolder + '/saga', voFile);
    const voNameNs = voNameWithNamespace(query);

    if(isCodyError(voNameNs)) {
        return voNameNs;
    }

    const arrayType = isArrayType(voNameNs, defs);
    const stateType = arrayType? voName : voName + ' | null';


    return `import {ReduxState} from "../reducer";
import {createSelector} from "reselect";
import {${voName}} from "${voImportPath}";
import {Fetch${voName}} from "../api/queries/Fetch${voName}";
import {matchQuery} from "../core/util/matchQuery";

const stateKey = '${lcWord(voName)}';

export const ${lcWord(voName)}Selector = (state: ReduxState): ${stateType} => state[stateKey];

export const make${voName}Selector = (query: Fetch${voName}) => {
    return createSelector([${lcWord(voName)}Selector], (state) => {
        if(!state || !matchQuery(state, query)) {
            return ${arrayType? '[]' : 'null'};
        }
        
        return state;
    });
}
`;
}

const getMandatoryFilterProp = (queryName: string, config: EngineConfig): string => {
    const filterProp = 'docId';

    if(!config.queries.hasOwnProperty(queryName)) {
        return filterProp;
    }

    const schema = config.queries[queryName].schema;

    if(!schema.hasOwnProperty('required') || !schema.required || schema.required.length === 0) {
        return filterProp
    }

    return schema.required[0];
}

const compileStateDescription = async (document: Node, metadata: DocumentMetadata, stateIdentifier: string, dirNamespace: string, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): Promise<string | CodyResponse> => {
    const voName = nodeNameToPascalCase(document);
    const schema = await dereferenceSchema(metadata.schema, defs);
    const uiSchema = metadata.uiSchema? 'uiSchema: ' + JSON.stringify(metadata.uiSchema, null, 8) : '';
    const coreImport = dirNamespace.split('/').map(s => s.length > 0 ? '..' : '').join('/');

    return `import {StateDescription} from "../..${coreImport}/core/types";

export const ${voName}Schema = ${JSON.stringify(schema, null, 4)};

export const ${voName}Description: StateDescription = {
    stateName: "${voName}",
    stateIdentifier: "${stateIdentifier}",
    schema: ${voName}Schema,
    ${uiSchema}
}
`;
}

const determineStateIdentifierIfAggregateStateIsReferenced =  async (document: Node, config: EngineConfig, defs: SchemaDefinitions, ctx: Context): Promise<string | null | CodyResponse> => {
    const events = getSourcesOfType(document, NodeType.event, true, false, true);
    if(isCodyError(events)) {
        return events;
    }

    let aggregateType = null;

    for (const event of events) {
        const evtArType = getAggregateTypeForEvent(event, config, ctx);

        if(evtArType) {
            if(aggregateType === null ) {
                aggregateType = evtArType;
            } else if(aggregateType !== evtArType) {
                // Stop here since read model is composed of events from different aggregates
                return null;
            }
        }
    }

    if(!aggregateType) {
        return null;
    }

    const metadata = extractDocumentMetadata(document);
    if(isCodyError(metadata)) {
        return metadata;
    }

    const aggregateConfig = config.aggregates[aggregateType] || null;
    if(!aggregateConfig) {
        return null;
    }

    if(!metadata.aggregateState) {
        return null;
    }

    return aggregateConfig.aggregateIdentifier;
}

const getAggregateTypeForEvent = (event: Node, config: EngineConfig, ctx: Context): string | null => {
    const evtName = messageName(event, ctx);
    if(!config.events.hasOwnProperty(evtName) || !config.events[evtName].aggregateType) {
        return null;
    }

    return config.events[evtName].aggregateType as string;
}
