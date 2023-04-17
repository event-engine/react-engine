import {Breadcrumb} from "../util/hook/useBreadcrumbs";
import {Action, handleActions} from "redux-actions";
import {BreadcrumbsPayload, setCurrentBreadcrumbs} from "../action/breadcrumbsCommands";

export const initialState = [];

/* eslint @typescript-eslint/no-unused-vars: 0 */
export const reducer = handleActions<Breadcrumb[], any>({
    [setCurrentBreadcrumbs.toString()]: (state = initialState, action: Action<BreadcrumbsPayload>) => {
        if(!state) {
            return state;
        }

        return action.payload.breadcrumbs
    },
}, initialState)
