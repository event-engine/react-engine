import {CodyResponse} from "../../src/general/response";
import {writeFileSync} from "../../src/utils/filesystem";
import {EngineConfig} from "../types";
import {Context} from "../context";

export const refreshRootSagaFile = (
    config: EngineConfig,
    ctx: Context
): CodyResponse | null => {
    let importStr = "";
    let sagaList = `
    enqueueSnackbarFlow,
    executeCommandFlow,
    clearCommandFlow,
`;
    for(const sagaName of config.sagas) {
        importStr = importStr + `import {${sagaName}} from "./${sagaName}";\n`;
        sagaList = sagaList + `    ${sagaName},\n`;
    }

    const content = `import { all, call, delay, spawn } from 'redux-saga/effects';
import {Logger} from '../core/util/Logger';
import {enqueueSnackbarFlow} from '../core/saga/enqueueSnackbarFlow';
import {executeCommandFlow} from '../core/saga/executeCommandFlow';
import {clearCommandFlow} from '../core/saga/clearCommandFlow';
${importStr}
/**
 * Prevents the root saga from terminating entirely due to some error in another saga
 *
 * @param saga
 */
const makeRestartable = (saga: any) => {
    return function*() {
        yield spawn(function*() {
            while (true) {
                try {
                    yield call(saga);
                    Logger.error('unexpected root saga termination. The root sagas are supposed to be sagas that live during the whole app lifetime!', saga);
                } catch (e) {
                    Logger.error('Saga error, the saga will be restarted', e);
                }
                yield delay(1000); // Workaround to avoid infinite error loops
            }
        });
    };
};

const rootSagas: any = [
${sagaList}
].map(makeRestartable);

export default function* rootSaga() {
    Logger.log('root saga started');
    yield all(rootSagas.map((saga: any) => call(saga)));
}
`;

    return writeFileSync(ctx.feFolder + '/saga/rootSaga.ts', content);
}
