import { Outlet } from 'react-router-dom'
import { AudioPlayerProvider } from './AudioPlayerContext'
import { AudioPlayerBar } from './AudioPlayerBar'

export default function MusicLayout() {
  return (
    <AudioPlayerProvider>
      <div style={{ minHeight: '100%', paddingBottom: '90px', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
        <AudioPlayerBar />
      </div>
    </AudioPlayerProvider>
  )
}
