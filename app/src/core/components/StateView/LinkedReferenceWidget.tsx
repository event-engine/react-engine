import * as React from 'react';
import {WidgetProps} from "@rjsf/core";
import Link from "../Link";
import * as Route from "../../../routes";

interface LinkedReference {
    link: string;
    display: string;
}

interface OwnProps {

}

type LinkedReferenceWidgetProps = OwnProps & WidgetProps;

const LinkedReferenceWidget = (props: LinkedReferenceWidgetProps) => {
    console.log(props);

    // Should be injected by component
    const reference: LinkedReference | undefined = props.options.reference as LinkedReference;

    return <div className="MuiFormControl-root MuiTextField-root">
        <label className={"MuiFormLabel-root MuiInputLabel-root MuiInputLabel-formControl MuiInputLabel-animated MuiInputLabel-shrink Mui-disabled Mui-disabled MuiFormLabel-filled" + (props.required? " Mui-required" : "")}>
            {props.label}
        </label>
        <div className="MuiInputBase-root MuiInput-root MuiInput-underline Mui-disabled Mui-disabled MuiInputBase-formControl MuiInput-formControl">
            {reference? <Link to={reference.link} style={{padding: '6px 0 7px'}}>{reference.display}</Link> : <div style={{padding: '6px 0 7px'}}>{props.value}</div>}
        </div>
    </div>
};

export default LinkedReferenceWidget;
