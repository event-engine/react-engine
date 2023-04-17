import {CodyResponse} from "../../src/general/response";
import {EngineConfig} from "../types";
import {Context} from "../context";
import {lcWord} from "../../src/utils/string";
import {writeFileSync} from "../../src/utils/filesystem";

export const refreshRootReducerFile = (
    config: EngineConfig,
    ctx: Context
): CodyResponse | null => {
    let imports = '';
    let reduxState = '';
    let initialState = '';
    let rootReducer = '';

    for(const queryName in config.queries) {
        if(!config.queries.hasOwnProperty(queryName)) {
            continue;
        }

        imports = imports + `import {
    ${queryName}State,
    initialState as ${lcWord(queryName)}InitialState,
    reducer as ${lcWord(queryName)}Reducer,
} from './reducer/${lcWord(queryName)}Reducer';\n`;

        reduxState = reduxState + `    ${lcWord(queryName)}: ${queryName}State;\n`;
        initialState = initialState + `    ${lcWord(queryName)}: ${lcWord(queryName)}InitialState,\n`;
        rootReducer = rootReducer + `    ${lcWord(queryName)}: ${lcWord(queryName)}Reducer,\n`;
    }

    const content = `import {combineReducers} from 'redux';
import {
    SnackbarState,
    initialState as snackbarInitialState,
    reducer as snackbarReducer,
} from './core/reducer/snackbarReducer';
import {
    SettingsState,
    initialState as settingsInitialState,
    reducer as settingsReducer,
} from './core/reducer/settingsReducer';
import {
    CommandState,
    initialState as commandInitialState,
    reducer as commandReducer,
} from './core/reducer/commandReducer';
import {
    initialState as breadcrumbsInitialState,
    reducer as breadcrumbsReducer,
} from './core/reducer/breadcrumbsReducer';
import {
    initialState as userInitialState,
    reducer as userReducer, UserState,
} from './core/reducer/userReducer';
import storage from 'redux-persist/lib/storage';
import {persistReducer} from 'redux-persist';
import {Breadcrumb} from "./core/util/hook/useBreadcrumbs";
${imports}

const persistConfig = {
    key: 'root',
    storage,
    whitelist: [],
};

const settingsPersistConfig = {
    key: 'settings',
    storage,
    whitelist: ['messageBoxUrl', 'context', 'theme'],
};

export interface ReduxState {
    snackbar: SnackbarState;
    settings: SettingsState;
    command: CommandState;
    breadcrumbs: Breadcrumb[];
    user: UserState;
${reduxState}
}

export const initialState: ReduxState = {
    snackbar: snackbarInitialState,
    settings: settingsInitialState,
    command: commandInitialState,
    breadcrumbs: breadcrumbsInitialState,
    user: userInitialState,
${initialState}
};

const rootReducer = combineReducers({
    snackbar: snackbarReducer,
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    command: commandReducer,
    breadcrumbs: breadcrumbsReducer,
    user: userReducer,
${rootReducer}
});

export const reducer = persistReducer(
    persistConfig,
    rootReducer,
);
`;

    return writeFileSync(ctx.feFolder+'/reducer.ts', content);
}

