import {Breadcrumb} from "../util/hook/useBreadcrumbs";
import {createAction} from "redux-actions";

export interface BreadcrumbsPayload {
    breadcrumbs: Breadcrumb[];
}

export const setCurrentBreadcrumbs = createAction<BreadcrumbsPayload>('SET_CURRENT_BREADCRUMBS');
