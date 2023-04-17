import createSagaMiddleware from 'redux-saga';
import {applyMiddleware, compose, createStore} from 'redux';
import {initialState, reducer} from './reducer';
import rootSaga from './saga/rootSaga';
import { persistStore } from 'redux-persist';
import {defaultEeUiConfig} from './defaultEeUIConfig';
import * as process from "process";

const sagaMiddleware = createSagaMiddleware();
const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore(
    reducer,
    initialState as any,
    composeEnhancers(applyMiddleware(sagaMiddleware)),
);

export const persistor = persistStore(store as any, {});

if (process.env.REACT_APP_PERSISTOR_PURGE === 'true') {
    persistor.purge();
}

sagaMiddleware.run(rootSaga);
