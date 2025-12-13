import React from 'react';

const SearchVenuesForm = ({ onChange }) => (
  <div className="search">
    <input type="text" placeholder="Search Venues" onChange={onChange} />
  </div>
);

export default SearchVenuesForm;
