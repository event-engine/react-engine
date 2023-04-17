import React from 'react';

import { AddButtonProps } from '@rjsf/core';

import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';

interface OwnProps {
    label: string;
}

type MergeAddButtonProps = OwnProps & AddButtonProps

// Directly copied from: https://github.com/rjsf-team/react-jsonschema-form/tree/master/packages/material-ui/src/AddButton
// to be able to use it in ArrayFieldTemplate
const AddButton: React.FC<MergeAddButtonProps> = props => (
    <Button {...props} color="secondary">
        <AddIcon /> {props.label}
    </Button>
);

export default AddButton;
