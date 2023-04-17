import axios, {AxiosRequestConfig, AxiosResponse} from "axios";
import {eeUiConfig, updateEeUiConfigEnv} from '../../config';
import {Logger} from "../util/Logger";
import {configuredAxios} from "./configuredAxios";
import {kebabCase} from "lodash";


configuredAxios.interceptors.request.use((requestConfig: any) => {
    requestConfig.metadata = { startTime: new Date() };
    return requestConfig;
});

configuredAxios.interceptors.response.use(
    (response: any) => {
        response.config.metadata.endTime = new Date();
        response.config.metadata.requestTime = response.config.metadata.endTime - response.config.metadata.startTime;
        return response;
    },
    (error: any) => {
        if (error.response) {
            error.response.config.metadata.endTime = new Date();
            error.response.config.metadata.requestTime =
                error.response.config.metadata.endTime - error.response.config.metadata.startTime;
        }

        return Promise.reject(error);
    },
);

export const sendApiRequest = async (
    requestConfig: AxiosRequestConfig,
) => {
    const config = eeUiConfig();
    const finalizedRequestConfig = await config.hooks.preRequestHook(requestConfig, config.env, updateEeUiConfigEnv);

    try {
        const response = await configuredAxios(finalizedRequestConfig);
        return await config.hooks.postRequestHook(response, config.env, updateEeUiConfigEnv);
    } catch (error) {
        Logger.error(error);
        throw error;
    }
};

const executeCommand = async (commandName: string, payload: any): Promise<AxiosResponse> => {
    return await sendApiRequest({
        url: `${eeUiConfig().env.messageBoxUrl}/${kebabCase(commandName)}`,
        method: 'post',
        data: payload,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

const executeEvent = async (eventName: string, payload: any): Promise<AxiosResponse> => {
    return await sendApiRequest({
        url: `${eeUiConfig().env.messageBoxUrl}/${kebabCase(eventName)}`,
        method: 'post',
        data: payload,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

async function executeQuery<T = any>(queryName: string, payload: any): Promise<AxiosResponse<T>> {


    return await sendApiRequest({
        url: `${eeUiConfig().env.messageBoxUrl}/${kebabCase(queryName)}`,
        method: 'get',
        params: payload,
        headers: {
            'Accept': 'application/json',
        },
    });
}

export const Api = {
    executeCommand,
    executeQuery,
    executeEvent,
};
