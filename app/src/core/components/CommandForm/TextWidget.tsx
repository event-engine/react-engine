import * as React from 'react';
import {Widgets} from "@rjsf/material-ui";
import {TextWidgetProps as MUITextWidgetProps} from "@rjsf/material-ui/dist/TextWidget";

interface OwnProps {

}

type TextWidgetProps = OwnProps & MUITextWidgetProps;

/**
 * Wrapper for MUITextWidget to take uiSchema['ui:title'] into account
 */
const TextWidget = (props: TextWidgetProps) => {
    const title = props?.uiSchema?.['ui:title'];
    const _props = {...props};

    if(title) {
        _props.label = title;
    }

    return Widgets.TextWidget(_props);
};

export default TextWidget;
