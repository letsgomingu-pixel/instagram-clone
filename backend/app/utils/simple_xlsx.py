"""Minimal xlsx writer for admin downloads. No third-party spreadsheet library."""

from __future__ import annotations

import zipfile
from dataclasses import dataclass, field
from io import BytesIO
from xml.sax.saxutils import escape


@dataclass
class Sheet:
    name: str
    headers: list[str]
    rows: list[list[str | int | None]]
    numeric_columns: set[int] = field(default_factory=set)


def workbook_bytes(sheets: list[Sheet]) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _content_types(len(sheets)))
        archive.writestr("_rels/.rels", _root_rels())
        archive.writestr("xl/workbook.xml", _workbook(sheets))
        archive.writestr("xl/_rels/workbook.xml.rels", _workbook_rels(len(sheets)))
        archive.writestr("xl/styles.xml", _styles())
        for index, sheet in enumerate(sheets, start=1):
            archive.writestr(f"xl/worksheets/sheet{index}.xml", _worksheet(sheet))
    return buffer.getvalue()


def _content_types(sheet_count: int) -> str:
    overrides = [
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ]
    for index in range(1, sheet_count + 1):
        overrides.append(
            f'<Override PartName="/xl/worksheets/sheet{index}.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        )
    body = "".join(overrides)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        f"{body}</Types>"
    )


def _root_rels() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        "</Relationships>"
    )


def _workbook(sheets: list[Sheet]) -> str:
    items = []
    for index, sheet in enumerate(sheets, start=1):
        items.append(f'<sheet name="{escape(sheet.name)}" sheetId="{index}" r:id="rId{index}"/>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f"<sheets>{''.join(items)}</sheets></workbook>"
    )


def _workbook_rels(sheet_count: int) -> str:
    items = []
    for index in range(1, sheet_count + 1):
        items.append(
            f'<Relationship Id="rId{index}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            f'Target="worksheets/sheet{index}.xml"/>'
        )
    style_id = sheet_count + 1
    items.append(
        f'<Relationship Id="rId{style_id}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f"{''.join(items)}</Relationships>"
    )


def _styles() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
        '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
        '<fills count="3"><fill><patternFill patternType="none"/></fill>'
        '<fill><patternFill patternType="gray125"/></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FFF4F6F8"/></patternFill></fill></fills>'
        '<borders count="1"><border><left/><right/><top/><bottom/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        '<cellXfs count="3">'
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">'
        '<alignment horizontal="center"/></xf>'
        '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
        "</cellXfs></styleSheet>"
    )


def _worksheet(sheet: Sheet) -> str:
    width = max(len(sheet.headers), 1)
    cols = []
    for index in range(width):
        header = sheet.headers[index] if index < len(sheet.headers) else ""
        cols.append(f'<col min="{index + 1}" max="{index + 1}" width="{max(12, len(header) + 6)}" customWidth="1"/>')
    rows_xml = [_row(1, sheet.headers, numeric_columns=set(), header=True)]
    for offset, row in enumerate(sheet.rows, start=2):
        rows_xml.append(_row(offset, row, sheet.numeric_columns, header=False))
    last_row = max(1, len(sheet.rows) + 1)
    dimension = f"A1:{_col_letter(width - 1)}{last_row}"
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"<dimension ref=\"{dimension}\"/>"
        f"<cols>{''.join(cols)}</cols>"
        f"<sheetData>{''.join(rows_xml)}</sheetData>"
        "</worksheet>"
    )


def _row(row_index: int, values: list[str | int | None], numeric_columns: set[int], *, header: bool) -> str:
    cells = []
    for index, value in enumerate(values):
        ref = f"{_col_letter(index)}{row_index}"
        if header:
            cells.append(f'<c r="{ref}" t="inlineStr" s="1"><is><t>{escape(str(value or ""))}</t></is></c>')
            continue
        if index in numeric_columns and isinstance(value, int):
            cells.append(f'<c r="{ref}" s="2"><v>{value}</v></c>')
            continue
        text = "" if value is None else str(value)
        cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(text)}</t></is></c>')
    return f'<row r="{row_index}">{"".join(cells)}</row>'


def _col_letter(index: int) -> str:
    letters = ""
    number = index + 1
    while number:
        number, remainder = divmod(number - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters
