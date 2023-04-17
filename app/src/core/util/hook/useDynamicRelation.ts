import {Action} from "redux";
import {ReduxState} from "../../../reducer";
import {cloneDeepJSON} from "../cloneDeepJSON";
import {useDispatch, useSelector} from "react-redux";
import {useEffect} from "react";

const readValue = <O = unknown>(originalData: O, propPath: string): any => {
    const pathArr = propPath.split(".");

    let value: any = originalData;

    pathArr.forEach(prop => {
        if(typeof value === 'object' && value.hasOwnProperty(prop)) {
            value = value[prop];
            return;
        } else {
            value = undefined;
        }
    })

    return value;
}

export const useDynamicRelation = <O = unknown , R = unknown, TSelected = unknown>(
    originalData: O[],
    propertyPath: string,
    foreignProperty: string,
    query: Action,
    selector: (state: ReduxState) => TSelected,
    triggerQuery: boolean = true
): Array<O & {[relationProperty: string]: R}> => {
    let copiedData = cloneDeepJSON(originalData);

    const dispatch = useDispatch();
    let relations: TSelected | TSelected[] = useSelector(selector);

    useEffect(() => {
        if(triggerQuery) {
            dispatch(query)
        }
    }, [triggerQuery]);

    if(!relations) {
        return originalData as Array<O & {[relationProperty: string]: R}>;
    }

    if(!Array.isArray(relations)) {
        relations = [relations];
    }

    copiedData = copiedData.map(element => {
        let match: R;

        if(Array.isArray(relations)) {
            // @ts-ignore
            match = relations.find(rel => rel[foreignProperty] === readValue(element, propertyPath));
        }

        // @ts-ignore
        element['__' + propertyPath + 'Relation'] = match;

        return element;
    })

    // @ts-ignore
    return copiedData;
}
