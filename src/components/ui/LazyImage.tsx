import {useEffect, useRef, useState} from 'react'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    // How far outside the viewport (in the scroll container) to start loading —
    // e.g. '200% 0px' to preload ~2 extra screens horizontally ahead/behind for
    // a fast-scrolling carousel. Larger on TV so a few extra cards either side
    // of the visible ones are already loaded by the time they scroll into view.
    rootMargin?: string
}

// Only sets <img src> once the element is within `rootMargin` of the nearest
// scrollable ancestor's viewport, instead of loading every poster in a row/grid
// up front. Unlike react-window-style index math, this needs no knowledge of
// item size/count and stays correct across resizes for free.
export function LazyImage({src, rootMargin = '200px', onError, ...imgProps}: LazyImageProps) {
    const ref = useRef<HTMLImageElement>(null)
    const [shouldLoad, setShouldLoad] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setShouldLoad(true)
                    observer.disconnect()
                }
            },
            {rootMargin}
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [rootMargin])

    return (
        <img
            ref={ref}
            src={shouldLoad ? src : undefined}
            onError={onError}
            {...imgProps}
        />
    )
}
