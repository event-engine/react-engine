import {CodyHook} from "../src/board/code";
import {Context} from "./context";
import {CodyResponse, CodyResponseType, isCodyError} from "../src/general/response";
import {Node} from "../src/board/graph";
import {nodeNameToPascalCase} from "../src/utils/string";
import {mkdirIfNotExistsSync, writeFileSync} from "../src/utils/filesystem";
import * as fs from 'fs';
import {extractAggregateMetadata} from "./utils/metadata";
import {
    loadEventEngineConfig,
    loadSchemaDefinitions,
    upsertAggregateConfig
} from "./utils/config";

export const onAggregateHook: CodyHook<Context> = async (aggregate: Node, ctx: Context): Promise<CodyResponse> => {
    const metadata = extractAggregateMetadata(aggregate);
    let successDetails = 'Checklist:\n\n';

    if(isCodyError(metadata)) {
        return metadata;
    }

    const arDir = await createAggregateModuleIfNotExists(aggregate, ctx, true);

    if(isCodyError(arDir)) {
        return arDir;
    }

    successDetails = successDetails + `✔️ Aggregate module ${arDir} prepared\n`;

    return {
        cody: `"${aggregate.getName()}" is add to the app.`,
        details: ['%c'+successDetails, 'color: #73dd8e;font-weight: bold'],
    }
}

type Success = string;
type Error = CodyResponse;

export const createAggregateModuleIfNotExists = async (aggregate: Node, ctx: Context, updateStateFile: boolean = false): Promise<Success | Error> => {
    const arDir = ctx.feFolder + '/model/'+nodeNameToPascalCase(aggregate);
    const metadata = extractAggregateMetadata(aggregate);
    const defs = loadSchemaDefinitions(ctx);

    if(isCodyError(metadata)) {
        return metadata;
    }

    if(isCodyError(defs)) {
        return defs;
    }

    const arDirErr = mkdirIfNotExistsSync(arDir);
    if(arDirErr) {
        return arDirErr;
    }

    const subDirs = ['/commands', '/events', '/handlers', '/reducers'];

    for(let dir of subDirs) {
        dir = arDir + dir;
        const dirErr = mkdirIfNotExistsSync(dir);
        if(dirErr) {
            return dirErr;
        }
    }

    const reducersIndexFile = arDir + '/reducers/index.ts';
    if(!fs.existsSync(reducersIndexFile)) {
        const riErr = writeFileSync(reducersIndexFile, `export default {}`);

        if(riErr) {
            return riErr;
        }
    }

    const handlersIndexFile = arDir + '/handlers/index.ts';
    if(!fs.existsSync(handlersIndexFile)) {
        const hiErr = writeFileSync(handlersIndexFile, `export default {}`);

        if(hiErr) {
            return hiErr;
        }
    }

    const eeConfig = loadEventEngineConfig(ctx);

    if(isCodyError(eeConfig)) {
        return eeConfig
    }

    const arConfigErr = upsertAggregateConfig(aggregate.getLink(), metadata, eeConfig, ctx);

    if(isCodyError(arConfigErr)) {
        return arConfigErr;
    }

    const aggregateTypes = Object.keys(eeConfig.aggregates);
    let importStr = '';
    let exportStr = '';
    for(const arType of aggregateTypes) {
        importStr = importStr + `import ${arType}Handlers from './${arType}/handlers';\n`;
        importStr = importStr + `import ${arType}Reducers from './${arType}/reducers';\n`;

        exportStr = exportStr + `    ${arType}Handlers,\n`;
        exportStr = exportStr + `    ${arType}Reducers,\n`;
    }

    const modelIndexContent = `${importStr}
export default {
${exportStr}
}
`
    const mIErr = writeFileSync(ctx.feFolder + '/model/index.ts', modelIndexContent);

    if(mIErr) {
        return mIErr;
    }

    return arDir;
}
