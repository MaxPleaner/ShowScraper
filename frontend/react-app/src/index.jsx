import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';

import { HashRouter, Routes, Route } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter basename="/">
      <Routes>
        <Route exact path="/" element={<App route='TextAndImagesView' />} />
        <Route path="/TextAndImagesView" element={<App route='TextAndImagesView' />} />
        <Route path="/TextView" element={<App route='TextView' />} />
        <Route path="/VenuesListView" element={<App route='VenuesListView' />} />
        <Route path="/About" element={<App route='About' />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
