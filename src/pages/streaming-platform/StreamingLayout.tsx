import { Outlet } from 'react-router-dom'

// Remote-control pairing (provider/room badge/navigation listener) is mounted
// once app-wide in AppLayout so it survives navigation outside /streaming too.
export default function StreamingLayout() {
    return <Outlet/>
}
