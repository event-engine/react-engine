import {ReduxState} from "../../reducer";
import {createSelector} from "reselect";
import {Breadcrumb} from "../util/hook/useBreadcrumbs";

const stateKey = 'breadcrumbs';

export const currentBreadcrumbsSelector = (state: ReduxState) => state[stateKey];

export const makeCurrentBreadcrumbsSelector = () => {
    return createSelector(
        [currentBreadcrumbsSelector],
        (breadcrumbs: Breadcrumb[]): Breadcrumb[] => breadcrumbs
    )
}
