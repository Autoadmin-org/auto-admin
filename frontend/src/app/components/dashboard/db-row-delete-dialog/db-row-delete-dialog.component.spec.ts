import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

import { DbRowDeleteDialogComponent } from './db-row-delete-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { TableRowService } from 'src/app/services/table-row.service';
import { of } from 'rxjs';

describe('DbRowDeleteDialogComponent', () => {
  let component: DbRowDeleteDialogComponent;
  let fixture: ComponentFixture<DbRowDeleteDialogComponent>;
  let tableRowService: TableRowService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DbRowDeleteDialogComponent ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DbRowDeleteDialogComponent);
    component = fixture.componentInstance;
    tableRowService = TestBed.inject(TableRowService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delete table row', () => {
    const fakeDeleteRow = spyOn(tableRowService, 'deleteTableRow').and.returnValue(of());
    spyOn(mockDialogRef, 'close');

    component.connectionID = '12345678';
    component.selectedTableName = 'Users';
    component.rowKeyAttributes = { id: 1 };

    component.deleteRow();
    expect(fakeDeleteRow).toHaveBeenCalledOnceWith('12345678', 'Users', {id: 1});
    // expect(component.dialogRef.close).toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
  });
});
