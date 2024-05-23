import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled, { createGlobalStyle } from 'styled-components';
import { useTable, useSortBy, usePagination } from 'react-table';
import debounce from 'lodash.debounce';

const Title = styled.h1`
  text-align: center;
  font-size: 24px;
  margin-bottom: 20px;
`;

const GlobalStyle = createGlobalStyle`
  body {
    font-family: Arial, sans-serif;
    background-color: #f4f7f6;
    margin: 0;
    padding: 20px;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
`;

const Th = styled.th`
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  text-align: left;
  border: 1px solid #ddd;
  cursor: pointer;
`;

const Td = styled.td`
  padding: 12px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
`;

const Input = styled.input`
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 10px 20px;
  margin: 5px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  font-size: 16px;

  &:disabled {
    background-color: #ddd;
    cursor: not-allowed;
  }

  &:hover:enabled {
    background-color: #45a049;
  }
`;

const EditDialogContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const EditDialog = ({ row, onSave, onCancel }) => {
  const [editedRow, setEditedRow] = useState(row);

  const handleChange = (e, columnId) => {
    const { value } = e.target;
    setEditedRow(prev => ({
      ...prev,
      [columnId]: value,
    }));
  };

  return (
    <>
      <Overlay onClick={onCancel} />
      <EditDialogContainer>
        <h3>Edit Row</h3>
        {Object.keys(row).map(columnId => (
          <div key={columnId}>
            <label>{columnId}: </label>
            <Input
              type="text"
              value={editedRow[columnId]}
              onChange={e => handleChange(e, columnId)}
            />
          </div>
        ))}
        <Button onClick={() => onSave(editedRow)}>Save</Button>
        <Button onClick={onCancel} style={{ backgroundColor: '#f44336' }}>
          Cancel
        </Button>
      </EditDialogContainer>
    </>
  );
};

const App = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchAuthorDetails = useCallback(async authorKey => {
    try {
      const response = await axios.get(`https://openlibrary.org/authors/${authorKey}.json`);
      const worksResponse = await axios.get(`https://openlibrary.org/authors/${authorKey}/works.json`);
      const works = worksResponse.data.entries;

      let topWork = 'N/A';

      if (works.length > 0) {
        const validWorks = works.filter(work => work.title && work.title !== '');
        if (validWorks.length > 0) {
          topWork = validWorks[0].title;
        }
      }

      return {
        birth_date: response.data.birth_date || 'Unknown',
        top_work: topWork
      };
    } catch (error) {
      console.error('Error fetching author details:', error);
      return {
        birth_date: 'Unknown',
        top_work: 'N/A'
      };
    }
  }, []);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('https://openlibrary.org/search.json?q=books');
      const bookData = await Promise.all(
        response.data.docs.map(async book => {
          const authorDetails = await fetchAuthorDetails(book.author_key[0]);
          return {
            title: book.title,
            author_name: book.author_name ? book.author_name[0] : 'Unknown',
            first_publish_year: book.first_publish_year,
            ratings_average: book.ratings_average || 'N/A',
            subject: book.subject ? book.subject[0] : 'N/A',
            author_birth_date: authorDetails.birth_date,
            author_top_work: authorDetails.top_work,
          };
        })
      );
      setBooks(bookData);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAuthorDetails]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleEditClick = row => {
    setEditingRow(row);
    setShowEditDialog(true);
  };

  const handleSave = editedRow => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.title === editedRow.title ? editedRow : book
      )
    );
    setShowEditDialog(false);
  };

  const handleCancel = () => {
    setShowEditDialog(false);
  };

  const debouncedSearch = useCallback(debounce(query => {
    setSearchQuery(query);
  }, 300), []);

  const handleSearchChange = e => {
    debouncedSearch(e.target.value);
  };

  const columns = useMemo(
    () => [
      { Header: 'Title', accessor: 'title' },
      { Header: 'Author', accessor: 'author_name' },
      { Header: 'First Publish Year', accessor: 'first_publish_year' },
      { Header: 'Average Rating', accessor: 'ratings_average' },
      { Header: 'Subject', accessor: 'subject' },
      { Header: 'Author Birth Date', accessor: 'author_birth_date' },
      { Header: 'Author Top Work', accessor: 'author_top_work' },
      {
        Header: 'Actions',
        Cell: ({ row }) => (
          <Button onClick={() => handleEditClick(row.original)}>Edit</Button>
        ),
      },
    ],
    []
  );

  const data = useMemo(() => {
    if (searchQuery) {
      return books.filter(book =>
        book.author_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return books;
  }, [books, searchQuery]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    state: { pageIndex, pageSize },
    nextPage,
    previousPage,
    setPageSize,
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  );

  if (loading) return <p>Loading...</p>;

  return (
    <Container>
      <GlobalStyle />
      <Title>Admin Dashboard</Title>
      <Input
        type="text"
        placeholder="Search by author"
        onChange={handleSearchChange}
      />
      <Table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <Th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
                  </span>
                </Th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <Td {...cell.getCellProps()}>{cell.render('Cell')}</Td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div>
        <Button onClick={() => previousPage()} disabled={!canPreviousPage}>
          Previous
        </Button>
        <Button onClick={() => nextPage()} disabled={!canNextPage}>
          Next
        </Button>
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
      {showEditDialog && (
        <EditDialog
          row={editingRow}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </Container>
  );
};

export default App;
