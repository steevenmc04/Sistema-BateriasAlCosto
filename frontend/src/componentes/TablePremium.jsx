const alignToClass = (align) => {
  if (align === 'center') return 'cell-center'
  if (align === 'right') return 'cell-right'
  return ''
}

export default function TablePremium({
  columns = [],
  data = [],
  renderCell,
  className = '',
  tableClassName = '',
  emptyMessage = 'No hay registros.',
  responsive = true,
  minWidthClass = 'min-w-[980px]',
  rowKey = 'id',
  rowClassName = '',
  loading = false,
  loadingMessage = 'Cargando...',
  footer = null,
}) {
  const content = (
    <table className={`table-premium ${minWidthClass} ${tableClassName}`.trim()}>
      <colgroup>
        {columns.map((column) => (
          <col key={`col-${column.key || column.label}`} className={column.widthClassName || ''} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => {
            const alignClass = alignToClass(column.align)
            return (
              <th
                key={column.key || column.label}
                className={`table-header-cell ${alignClass} ${column.headerClassName || ''}`.trim()}
              >
                {column.label}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td className="table-cell text-center" colSpan={columns.length}>
              {loadingMessage}
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td className="table-cell text-center" colSpan={columns.length}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row, rowIndex) => {
            const key =
              typeof rowKey === 'function'
                ? rowKey(row, rowIndex)
                : row?.[rowKey] ?? rowIndex

            return (
              <tr key={key} className={rowClassName}>
                {columns.map((column) => {
                  const alignClass = alignToClass(column.align)
                  const value = column.render
                    ? column.render(row, rowIndex)
                    : renderCell
                      ? renderCell(row, column, rowIndex)
                      : row?.[column.key]

                  return (
                    <td
                      key={`${key}-${column.key || column.label}`}
                      className={`table-cell ${alignClass} ${column.cellClassName || ''}`.trim()}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )

  return (
    <div className={`table-shell ${className}`.trim()}>
      {responsive ? content : content}
      {footer}
    </div>
  )
}
