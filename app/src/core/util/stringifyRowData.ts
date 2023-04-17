export function stringifyRowData<RowData extends object> (rowData: { [prop: string]: any }[], columns: string[]): RowData[] {
    return rowData.map(d => {
        const row: RowData = {} as RowData;

        for(const prop in d) {
            if(d.hasOwnProperty(prop)) {
                if(typeof d[prop] === 'object' && columns.includes(prop)) {
                    // @ts-ignore
                    row[prop] = JSON.stringify(d[prop]);
                } else {
                    // @ts-ignore
                    row[prop] = d[prop];
                }

            }
        }

        return row;
    })
}
