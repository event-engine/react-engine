import {ReduxState} from "../../../reducer";
import {Action} from "redux";
import {useDispatch, useSelector} from "react-redux";

export const useSyncingSelector = <T>(query: Action, selector: (state: ReduxState) => T, execQuery: boolean = true) => {
    const dispatch = useDispatch();

    const selectedData = useSelector(selector);

    if(selectedData) {
        return selectedData;
    }

    if (execQuery) {
        dispatch(query);
    }
}
