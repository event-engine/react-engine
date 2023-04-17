import {JSONSchema} from "../../types";
import {useDispatch, useSelector} from "react-redux";
import {useEffect} from "react";
import {cloneDeepJSON} from "../cloneDeepJSON";
import {Action} from "redux";
import {ReduxState} from "../../../reducer";

interface Mapping {
    label: string;
    value: string;
}

export const useDynamicEnum = <TSelected = unknown>(
    schema: JSONSchema,
    property: string,
    query: Action,
    selector: (state: ReduxState) => TSelected,
    mapping: Mapping): JSONSchema =>
{
    const newSchema = cloneDeepJSON(schema);
    const dispatch = useDispatch();
    const choices = useSelector(selector);

    useEffect(() => {
        if(Array.isArray(choices) && choices.length === 0) {
            dispatch(query)
        }
    }, []);

    if(
        newSchema.properties
        && newSchema.properties[property]
        && newSchema.properties[property].type
        && Array.isArray(choices)
    ) {
        const propType = newSchema.properties[property].type;

        newSchema.properties[property].anyOf = choices.map(choice => ({
            type: propType,
            title: choice[mapping.label] || 'Unknown',
            enum: [choice[mapping.value] || null]
        }));
    }

    return newSchema;
}
