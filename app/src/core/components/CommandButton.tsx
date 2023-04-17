import {Button} from '@material-ui/core';
import React from 'react';
import AddIcon from '@material-ui/icons/Add';
import {CommandDescription} from '../types';
import {camelCaseToTitle} from "../util/string";

interface CommandButtonProps {
    command: CommandDescription;
    onClick: () => void;
    label?: string;
    startIcon?: React.ReactNode | undefined;
    buttonColor?: 'inherit' | 'primary' | 'secondary' | 'default' | undefined;
    className?: string | undefined;
    disabled?: boolean;
    variant?: "text" | "outlined" | "contained"
}

export const commandTitle = (cmd: CommandDescription): string => {
    let uiTitle;

    if(cmd.uiSchema) {
        if(cmd.uiSchema['ui:title']) {
            uiTitle = cmd.uiSchema['ui:title'];
        }

        if(!uiTitle && cmd.uiSchema['ui:options'] && cmd.uiSchema['ui:options'].title) {
            uiTitle = cmd.uiSchema['ui:options'].title;
        }
    }

    const title = uiTitle || cmd.schema.title || cmd.commandName;

    if(title === cmd.commandName) {
        return camelCaseToTitle(cmd.commandName);
    }

    return title as string;
}

const CommandButton = (props: CommandButtonProps) => {
    return (
        <Button
            key={props.command.commandName}
            variant={props.variant || 'contained'}
            className={props.className}
            color={props.buttonColor? props.buttonColor : 'primary'}
            startIcon={props.startIcon? props.startIcon : props.command.createAggregate ? <AddIcon /> : undefined}
            children={props.label? props.label : commandTitle(props.command)}
            style={{ textTransform: 'none', margin: '5px' }}
            onClick={props.onClick}
            disabled={!!props.disabled}
        />
    );
};

export default CommandButton;
