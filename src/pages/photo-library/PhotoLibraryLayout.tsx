import React, { useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  FaImages,
  FaFolder,
  FaHeart,
  FaVideo,
  FaCloudUploadAlt,
  FaSyncAlt,
} from 'react-icons/fa'
import { uploadPhoto, reloadLibrary } from './api'
import styles from './PhotoLibraryLayout.module.css'

export default function PhotoLibraryLayout() {
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [isReloading, setIsReloading] = useState(false)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const total = files.length
    let succeeded = 0

    for (let i = 0; i < total; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${total}: ${files[i].name}...`)
      try {
        await uploadPhoto(files[i])
        succeeded++
      } catch (err) {
        console.error('Failed to upload file:', files[i].name, err)
      }
    }

    setUploadProgress(`Uploaded ${succeeded} of ${total} files!`)
    setTimeout(() => {
      setIsUploading(false)
      setUploadProgress('')
      window.dispatchEvent(new CustomEvent('photos-updated'))
    }, 1500)

    e.target.value = ''
  }

  const handleReload = async () => {
    setIsReloading(true)
    try {
      await reloadLibrary()
      window.dispatchEvent(new CustomEvent('photos-updated'))
    } catch (e) {
      console.error('Failed to reload library:', e)
    } finally {
      setIsReloading(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <FaImages className={styles.brandIcon} />
          <h1 className={styles.brandTitle}>Photo Library</h1>
        </div>

        <nav className={styles.navTabs}>
          <NavLink
            to="/photos"
            end
            className={({ isActive }) =>
              `${styles.tab} ${isActive && location.pathname === '/photos' ? styles.tabActive : ''}`
            }
          >
            <FaImages />
            <span>Timeline</span>
          </NavLink>
          <NavLink
            to="/photos/albums"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            <FaFolder />
            <span>Albums</span>
          </NavLink>
          <NavLink
            to="/photos/favorites"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            <FaHeart />
            <span>Favorites</span>
          </NavLink>
          <NavLink
            to="/photos/videos"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            <FaVideo />
            <span>Videos</span>
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <button
            className={styles.uploadBtn}
            onClick={handleUploadClick}
            disabled={isUploading}
            title="Upload photos or videos"
          >
            <FaCloudUploadAlt size={16} />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFilesSelected}
          />
          <button
            className={styles.iconBtn}
            onClick={handleReload}
            disabled={isReloading}
            title="Rescan and refresh photo storage"
          >
            <FaSyncAlt className={isReloading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {isUploading && (
        <div className={styles.uploadingBar}>
          <span>{uploadProgress}</span>
        </div>
      )}

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  )
}
