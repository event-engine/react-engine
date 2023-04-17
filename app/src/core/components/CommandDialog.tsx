import {
    Button, CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    makeStyles,
} from '@material-ui/core';
import GenerateMenu from './GenerateMenu';
import CloseIcon from '@material-ui/icons/Close';
import SendIcon from '@material-ui/icons/Send';
import CommandForm from './CommandForm';
import React, {useRef, useState} from 'react';
import {CommandDescription} from '../types';
import {cloneDeepJSON} from "../util/cloneDeepJSON";
import {useDispatch} from "react-redux";
import {clearCommand} from "../action/commandCommands";
import {Alert} from "@material-ui/lab";
import {commandTitle} from "./CommandButton";
import {enqueueSuccessSnackbar} from "../action/snackbarCommands";
import {Widget} from "react-jsonschema-form";
import {Field} from "@rjsf/core";

const useStyles = makeStyles(theme => ({
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(0.5),
        color: theme.palette.grey[500],
    },
    generateButton: {
        position: 'absolute',
        right: theme.spacing(6),
        top: theme.spacing(0.5),
        color: theme.palette.grey[500],
    },
}));

export interface AggregateIdentifier {
    identifier: string;
    value: string;
}

export interface ButtonConfig {
    color?: 'inherit' | 'primary' | 'secondary' | 'default' | undefined;
    className?: string | undefined;
    variant?: "text" | "outlined" | "contained";
    startIcon?: React.ReactNode | undefined;
}

interface CommandDialogProps {
    open: boolean;
    onClose: () => void;
    commandDialogCommand: CommandDescription;
    aggregateIdentifier?: AggregateIdentifier;
    aggregateState?: {[stateKey: string]: any};
    initialValues?: {[prop: string]: any};
    button?: ButtonConfig;
    widgets?: {[name: string]: Widget};
    fields?: {[name: string]: Field};
    onBeforeSubmitting?: (formData: {[prop: string]: any}) => {[prop: string]: any};
}

interface TransactionState {
    isSubmitting: boolean;
    isSubmitted: boolean;
    isError: boolean;
    isValidationError: boolean;
}

const defaultTransactionState: TransactionState = {
    isSubmitting: false,
    isSubmitted: false,
    isError: false,
    isValidationError: false,
}

const CommandDialog = (props: CommandDialogProps) => {

    const dispatch = useDispatch();
    const classes = useStyles();
    const commandFormRef = useRef<{submit: () => void}>();
    const [transactionState, setTransactionState] = useState<TransactionState>({...defaultTransactionState});
    const formData: {[prop: string]: any} = props.initialValues || {};

    if(props.aggregateIdentifier) {
        formData[props.aggregateIdentifier.identifier] = props.aggregateIdentifier.value;
    }

    if(props.aggregateState) {
        for(const stateKey of Object.keys(props.aggregateState)) {
            if(props.commandDialogCommand.schema.properties
                && Object.keys(props.commandDialogCommand.schema.properties).includes(stateKey)) {
                formData[stateKey] = cloneDeepJSON(props.aggregateState[stateKey]);
            }
        }
    }

    const handleCancel = () => {
        dispatch(clearCommand({}));
        setTransactionState({...defaultTransactionState})
        props.onClose();
    }

    const handleExecuteCommand = () => {
        if(transactionState.isError) {
            dispatch(clearCommand({}));
            setTransactionState({...defaultTransactionState})
            return;
        }

        if(transactionState.isSubmitted) {
            setTransactionState({...defaultTransactionState})
            props.onClose();
            return;
        }

        if(commandFormRef.current) {
            commandFormRef.current.submit();
        }
    };

    const handleResponseReceived = () => {
        dispatch(clearCommand({}));
        setTransactionState({...defaultTransactionState});
        dispatch(enqueueSuccessSnackbar({message: commandTitle(props.commandDialogCommand) + ' was successful'}));
        window.setTimeout(() => {
            props.onClose();
        }, 10);
    }

    return (
        <Dialog open={props.open} fullWidth={true} maxWidth={'lg'} onClose={handleCancel}>
            <DialogTitle>
                <GenerateMenu className={classes.generateButton} />
                <IconButton className={classes.closeButton} onClick={handleCancel}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent style={{ padding: '24px 24px' }}>
                <CommandForm
                    command={props.commandDialogCommand}
                    ref={commandFormRef}
                    onBeforeSubmitting={(formData) => {
                        setTransactionState({...defaultTransactionState, isSubmitting: true})
                        if(props.onBeforeSubmitting) {
                            formData = props.onBeforeSubmitting(formData);
                        }
                        return formData;
                    }}
                    onResponseReceived={handleResponseReceived}
                    onBackendErrorReceived={() => setTransactionState({...defaultTransactionState, isError: true, isSubmitted: true})}
                    onValidationError={() => setTransactionState({...defaultTransactionState, isValidationError: true})}
                    onChange={() => {
                        if(transactionState.isValidationError) {
                            setTransactionState({...defaultTransactionState})
                        }
                    }}
                    formData={formData}
                    widgets={props.widgets}
                    fields={props.fields}
                />
            </DialogContent>
            <DialogActions>
                {transactionState.isValidationError && <Alert severity="error">Validation failed! Please check your inputs.</Alert>}
                <Button
                    children={transactionState.isSubmitted? 'Close' : 'Cancel'}
                    onClick={handleCancel}
                    color={'secondary'}
                />
                <Button
                    variant={props.button?.variant || 'contained'}
                    color={props.button?.color || 'primary'}
                    startIcon={transactionState.isSubmitting? <CircularProgress size={20} /> : props.button?.startIcon || <SendIcon />}
                    style={{ textTransform: 'none', margin: '5px' }}
                    onClick={handleExecuteCommand}
                    disabled={transactionState.isSubmitting}
                    className={props.button?.className}
                >
                    {transactionState.isError? 'Try again' : commandTitle(props.commandDialogCommand)}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CommandDialog;
