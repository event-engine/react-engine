import { default as jwt, JwtHeader, SigningKeyCallback, VerifyErrors } from 'jsonwebtoken';
import JwksClient, { CertSigningKey, RsaSigningKey, SigningKey } from 'jwks-rsa' ;
import { KeycloakTokenParsed } from 'keycloak-js';
import {Logger} from "../util/Logger";

export interface TokenParsed extends KeycloakTokenParsed {
    iss: string;
}

let jwksClient: JwksClient.JwksClient;
let getKey: any;

export const isRsaSigningKey = (s?: SigningKey): s is RsaSigningKey => {
    if (s === undefined) {
        return false;
    }
    return s.hasOwnProperty('rsaPublicKey');
};
export const isCertSigningKey = (s?: SigningKey): s is CertSigningKey => {
    if (s === undefined) {
        return false;
    }
    return s.hasOwnProperty('publicKey');
};

export const initJwtVerify = (token: string, unsecureToken: TokenParsed) => {
    jwksClient = JwksClient({
        cache: true,
        strictSsl: process.env.REACT_APP_KC_VERIFY_SSL_CERTIFICATE === 'true',
        jwksUri: unsecureToken.iss + '/protocol/openid-connect/certs',
        requestHeaders: {}, // Optional
    });

    getKey = (header: JwtHeader, callback: SigningKeyCallback) => {
        // ensure integrity
        if (header.alg !== 'RS256' || header.typ !== 'JWT') {
            throw Error('Only RSA256 is supported for JWT');
        }

        jwksClient.getSigningKey(header.kid!, (err: Error | null, key: SigningKey) => {

            if (isRsaSigningKey(key)) {
                callback(err, key.rsaPublicKey);
                return;
            }
            if (isCertSigningKey(key)) {
                callback(err, key.publicKey);
                return;
            }

            Logger.error('Wrong signing key');
            Logger.error(err);
            callback(err);
        });
    };

};

export default (token: string) => {
    return new Promise<object>(
        (resolve, reject) => {
            jwt.verify(
                token,
                getKey,
                 // {algorithms: ['RS256']},
                (error: VerifyErrors | null, verifiedToken: object | string | undefined) => {
                    if (error) {
                        Logger.error(error);
                        return reject(error);
                    }

                    return resolve({
                        token,
                        verifiedToken,
                    });
                },
            );
        },
    );
};
