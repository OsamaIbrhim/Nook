import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
export function StoreLayout() { return <><Header/><main className="min-h-[65vh]"><Outlet/></main><Footer/></> }
