import { configureStore, combineReducers } from '@reduxjs/toolkit';
import testimonialsReducer from './slices/testimonialsSlice';
import brandReducer from './slices/brandSlice';
import creativeReducer from './slices/creativeSlice';
import reviewsReducer from './slices/reviewsSlice';


const rootReducer = combineReducers({
    testimonials: testimonialsReducer,
    brand: brandReducer,
    creative: creativeReducer,
    reviews: reviewsReducer,
});

export const store = configureStore({
    reducer: rootReducer,
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
