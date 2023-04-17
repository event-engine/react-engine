import { KeycloakProfile } from 'keycloak-js';
import Keycloak from 'keycloak-js';
import { delay, put, select, take } from 'redux-saga/effects';
import {Action} from "redux-actions";
import {userAuthenticated, UserAuthenticatedPayload} from "../action/authEvents";
import verifyJwt from '../api/ConfiguredJwtVerify';
import {signedIn} from "../action/userEvents";
import {distributeNewToken} from "../util/distributeNewToken";
import {enqueueInfoSnackbar, enqueueWarningSnackbar} from "../action/snackbarCommands";


interface KcUserAttributes {
    attributes: {

    }
};

type KcProfile = KeycloakProfile & KcUserAttributes;

export const keycloakPromise = <TSuccess>(promise: Keycloak.KeycloakPromise<TSuccess, any>) => new Promise<TSuccess>((resolve, reject) =>
    promise
        .then((result: TSuccess) => resolve(result))
        .catch((e: any) => reject(e)),
);

export function* tokenRefreshFlow() {

    const action: Action<UserAuthenticatedPayload> = yield take(userAuthenticated.toString());

    let authErrors = 0;
    const kc: Keycloak.KeycloakInstance = action.payload.kc;

    try {
        yield verifyJwt(kc.token!);
    } catch (e) {
        yield keycloakPromise(kc.login());
    }

    const profile: KcProfile = yield keycloakPromise<KeycloakProfile>(kc.loadUserProfile());

    yield put(signedIn({
        uid: kc.tokenParsed!.sub!,
        username: profile.username!,
        email: profile.email!,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        signedIn: true
    }));

    while (true) {
        yield delay(10000);
        try {
            const refreshed = yield keycloakPromise<boolean>(kc.updateToken(31));

            if (refreshed === false) {
                continue;
            }

            try {
                yield verifyJwt(kc.token!);

                distributeNewToken(kc.token!);
            } catch (e) {
                yield keycloakPromise(kc.login());
            }

            if (authErrors > 0) {
                yield put(enqueueInfoSnackbar({message: 'Authorization established'}))
            }

            authErrors = 0;
        } catch (e) {
            if(authErrors === 0) {
                yield put(enqueueWarningSnackbar({message: '[Authorization error] You will be logged out shortly if connection can not be restored.'}))
            }
            authErrors++;

            if (authErrors > 2) {
                // TODO maybe not logged out
                yield keycloakPromise(kc.login());
            }
        }
    }
}
