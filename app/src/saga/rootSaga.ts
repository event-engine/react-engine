import { all, call, delay, spawn } from 'redux-saga/effects';
import {Logger} from '../core/util/Logger';
import {enqueueSnackbarFlow} from '../core/saga/enqueueSnackbarFlow';
import {executeCommandFlow} from '../core/saga/executeCommandFlow';
import {clearCommandFlow} from '../core/saga/clearCommandFlow';

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

    enqueueSnackbarFlow,
    executeCommandFlow,
    clearCommandFlow,

].map(makeRestartable);

export default function* rootSaga() {
    Logger.log('root saga started');
    yield all(rootSagas.map((saga: any) => call(saga)));
}
