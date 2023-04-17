import {
    makeStyles, Typography,
} from '@material-ui/core';
import * as React from 'react';
import {State, StateDescription} from "../types";
import LoadingCard from "./LoadingCard";
import {CardContent, CardHeader} from "@material-ui/core";
import Form, {FieldTemplate} from "@rjsf/material-ui";
import {PropsWithChildren, useEffect} from "react";
import {ArrayFieldTemplateProps, Field, FieldTemplateProps, ObjectFieldTemplateProps} from "@rjsf/core";
import {triggerSideBarAnchorsRendered} from "../util/triggerSideBarAnchorsRendered";
import LinkedReferenceWidget from "./StateView/LinkedReferenceWidget";
import TextareaWidget from "./StateView/TextareaWidget";
import TextWidget from "./CommandForm/TextWidget";
import {Widget} from "react-jsonschema-form";

export const useStyles = makeStyles(theme => ({
    objPropTitleH2: {
        paddingTop: '40px',
        paddingBottom: '40px',
    },
    objPropTitleH3: {
        paddingTop: '30px',
        paddingBottom: '30px',
    },
    objPropTitleH4: {
        paddingTop: '20px',
        paddingBottom: '20px',
    },
    objPropTitleH5: {
        paddingTop: '10px',
        paddingBottom: '10px',
    },
    propertyWrapper: {
        marginBottom: '10px'
    }
}));

interface OwnProps {
    state?: State;
    description: StateDescription;
    widgets?: {[name: string]: Widget};
    fields?: {[name: string]: Field};
    objectFieldTemplate?: React.FunctionComponent<ObjectFieldTemplateProps>;
    arrayFieldTemplate?: React.FunctionComponent<ArrayFieldTemplateProps>;
    fieldTemplate?: React.FunctionComponent<FieldTemplateProps>;
}

type StateViewProps = OwnProps;

type HeadingVariant = "h2" | "h3" | "h4" | "h5";

export const headingNestingLevel = (idSchema: string): HeadingVariant => {
    const level = idSchema.split("_").length + 1;

    if(level === 1) {
        return "h2";
    }

    if(level > 5) {
        return "h5";
    }

    return "h"+level as HeadingVariant;
}

type Classes = typeof useStyles;

export const getObjPropTitleClass = (heading: HeadingVariant, classes: ReturnType<typeof useStyles>): string => {
    switch (heading) {
        case "h2":
            return classes.objPropTitleH2 + ' sidebar-anchor';
        case "h3":
            return classes.objPropTitleH3  + ' sidebar-anchor';
        case "h4":
            return classes.objPropTitleH4;
        case "h5":
            return classes.objPropTitleH5;
    }
}

export const ObjectFieldTemplate = (props: PropsWithChildren<ObjectFieldTemplateProps>) => {
    const classes = useStyles();

    const headingVariant = headingNestingLevel(props.idSchema.$id);

    if(props.uiSchema && props.uiSchema['ui:widget'] && props.uiSchema['ui:widget'] === 'hidden') {
        return <></>
    }

    let index = '';
    const match = props.idSchema.$id.match(/_(?<index>[\d]+)$/);

    if(match) {
        index = ' ' + (Number(match.groups!['index']) + 1);
    }

    return <div>
            <Typography id={props.idSchema.$id} key={props.idSchema.$id} variant={headingVariant} className={getObjPropTitleClass(headingVariant, classes)}>{props.title}{index}</Typography>
            {props.description}
            {props.properties.map(element => <div key={'ele_wrapper_' + element.name} className={classes.propertyWrapper}>{element.content}</div>)}
        </div>
}

export const ArrayFieldTemplate = (props: PropsWithChildren<ArrayFieldTemplateProps>) => {
    const classes = useStyles();

    const headingVariant = headingNestingLevel(props.idSchema.$id);

    if(props.uiSchema && props.uiSchema['ui:widget'] && props.uiSchema['ui:widget'] === 'hidden') {
        return <></>
    }

    return <div>
            <Typography id={props.idSchema.$id} key={props.idSchema.$id} variant={headingVariant} className={getObjPropTitleClass(headingVariant, classes)}>{props.title}</Typography>
            {props.items.map((element, index) => <div className={'array-element-wrapper'} key={'array_ele_wrapper_' + index}>{element.children}</div>)}
        </div>
    ;
}

const StateView = (props: StateViewProps) => {

    useEffect(() => {
        if(props.state) {
            triggerSideBarAnchorsRendered();
        }
    }, [props.state])

    const uiSchema = props.description.uiSchema? {"ui:readonly": true, ...props.description.uiSchema} : {"ui:readonly": true}

    const widgets = props.widgets || {};

    return <LoadingCard loading={!props.state} >
        <>{!props.state && <CardHeader title={props.description.schema.title || props.description.stateName} />}</>
        <>{props.state && <>
            <CardContent>
                <Form
                    schema={props.description.schema}
                    children={<></>}
                    formData={props.state}
                    uiSchema={uiSchema}
                    className="stateview"
                    ObjectFieldTemplate={props.objectFieldTemplate || ObjectFieldTemplate}
                    ArrayFieldTemplate={props.arrayFieldTemplate || ArrayFieldTemplate}
                    FieldTemplate={props.fieldTemplate || FieldTemplate}
                    widgets={
                        {
                            LinkedRef: LinkedReferenceWidget,
                            TextareaWidget: TextareaWidget,
                            TextWidget: TextWidget,
                            ...widgets
                        }
                    }
                    fields={props.fields}
                />
            </CardContent>
        </>}</>
    </LoadingCard>
};

export default StateView;
