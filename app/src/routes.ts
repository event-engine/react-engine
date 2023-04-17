import {State} from "./core/types";

export const dashboardPage = '/dashboard';

export const make = (route: string, parameters: State): string => {
    const parts = route.split('/');

    parts.forEach(part => {
        if(part.charAt(0) === ':') {
            const prop = part.slice(1);
            if(parameters.hasOwnProperty(prop)) {
                route = route.replace(part, parameters[prop]);
            }
        }
    })

    return route;
}
