import * as React from 'react';
import MaterialTable, { MaterialTableProps } from "material-table";
import { TablePagination, TablePaginationProps } from "@material-ui/core";

export function PatchedPagination(props: TablePaginationProps) {
    const {
        ActionsComponent,
        onChangePage,
        onChangeRowsPerPage,
        ...tablePaginationProps
    } = props;

    return (
        <TablePagination
            {...tablePaginationProps}
            // @ts-expect-error onChangePage was renamed to onPageChange
            // @ts-ignore
            onPageChange={onChangePage}
            onRowsPerPageChange={onChangeRowsPerPage}
            ActionsComponent={(subprops) => {
                const { onPageChange, ...actionsComponentProps } = subprops;
                return (
                    // @ts-expect-error ActionsComponent is provided by material-table
                    // @ts-ignore
                    <ActionsComponent
                        {...actionsComponentProps}
                        onChangePage={onPageChange}
                    />
                );
            }}
        />
    );
}
