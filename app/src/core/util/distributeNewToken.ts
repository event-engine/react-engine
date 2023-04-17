import {configuredAxios} from "../api/configuredAxios";

export const distributeNewToken = (token: string) => {
    configuredAxios.defaults.headers.Authorization = 'Bearer ' + token;

    // @ts-ignore
    //configuredSocket.io.opts.transportOptions!.polling.extraHeaders.Authorization = 'Bearer ' + token;
    /*
    const expiresDate = new Date();
    expiresDate.setTime(expiresDate.getTime() + 10 * 60 * 1000);
    document.cookie = 'token=' + token + ';path=/buckets/boards;expires=' + expiresDate.toUTCString();
     */
};
