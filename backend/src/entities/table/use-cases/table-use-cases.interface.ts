import { FindTablesDs } from '../application/data-structures/find-tables.ds';
import { FoundTableDs } from '../application/data-structures/found-table.ds';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds';
import { FoundTableRowsDs } from '../application/data-structures/found-table-rows.ds';

export interface IFindTablesInConnection {
  execute(inputData: FindTablesDs): Promise<Array<FoundTableDs>>;
}

export interface IGetTableRows {
  execute(inputData: GetTableRowsDs): Promise<FoundTableRowsDs>;
}