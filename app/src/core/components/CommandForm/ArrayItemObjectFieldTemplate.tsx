import * as React from 'react';
import {ObjectFieldTemplateProps} from "@rjsf/core";
import {ObjectFieldTemplate} from "@rjsf/material-ui";

interface OwnProps {

}

type ArrayItemObjectFieldTemplateProps = OwnProps & ObjectFieldTemplateProps;

const ArrayItemObjectFieldTemplate = (props: ArrayItemObjectFieldTemplateProps) => {
    if(props.uiSchema && props.uiSchema['ui:widget'] && props.uiSchema['ui:widget'] === 'hidden') {
        return <></>
    }

    // Check if field id ends with a number f.e.: images_0
    // This indicates that the object is an item of an array
    // if so, we add the index number to the title starting at 1 instead of 0 for better UX
    let index = '';
    const match = props.idSchema.$id.match(/_(?<index>[\d]+)$/);

    if(match) {
        index = ' ' + (Number(match.groups!['index']) + 1);
    }

    return ObjectFieldTemplate({...props, title: props.title + index});
};

export default ArrayItemObjectFieldTemplate;
