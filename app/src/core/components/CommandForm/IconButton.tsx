import React from "react";

import Button from "@material-ui/core/Button";
import Add from "@material-ui/icons/Add";
import ArrowUpward from "@material-ui/icons/ArrowUpward";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import Remove from "@material-ui/icons/Remove";
import { IconButtonProps as MuiIconButtonProps } from "@material-ui/core/IconButton";

const mappings: any = {
    remove: Remove,
    plus: Add,
    "arrow-up": ArrowUpward,
    "arrow-down": ArrowDownward,
};

type IconButtonProps = MuiIconButtonProps & {
    icon: string;
    iconProps?: object;
};

// Directly copied from: https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/material-ui/src/IconButton/IconButton.tsx
// to be able to use it in ArrayFieldTemplate
const IconButton = (props: IconButtonProps) => {
    const { icon, className, iconProps, ...otherProps } = props;
    const IconComp = mappings[icon];
    return (
        <Button {...otherProps} size="small">
            <IconComp {...iconProps} />
        </Button>
    );
};

export default IconButton;
