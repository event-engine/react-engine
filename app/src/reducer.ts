import {combineReducers} from 'redux';
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

}

export const initialState: ReduxState = {
    snackbar: snackbarInitialState,
    settings: settingsInitialState,
    command: commandInitialState,
    breadcrumbs: breadcrumbsInitialState,
    user: userInitialState,

};

const rootReducer = combineReducers({
    snackbar: snackbarReducer,
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    command: commandReducer,
    breadcrumbs: breadcrumbsReducer,
    user: userReducer,
});

export const reducer = persistReducer(
    persistConfig,
    rootReducer,
);
