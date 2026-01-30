import { status } from '../definitions';
import { NotAutenticatedError, parseJson, ServerOfflineError } from '../Errors';

export const client_id = __MAL_SYNC_KEYS__.simkl.id;

export function getAuthUrl() {
  return `h  // Anime - Atualizamos se necessário ou se especificamente solicitado
  if (
    !requestedType || 
    requestedType === 'anime' || 
    !lastCheck?.anime?.all ||
    (lastCheck.anime && activity.anime && lastCheck.anime.all !== activity.anime.all)
  ) {simkl.com/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=https://simkl.com/apps/chrome/mal-sync/connected/`;
}

export function translateList(simklStatus, malStatus: null | number = null) {
  const list = {
    watching: status.Watching,
    plantowatch: status.PlanToWatch,
    completed: status.Completed,
    notinteresting: status.Dropped,
    hold: status.Onhold,
  };
  if (malStatus !== null) {
    return Object.keys(list).find(key => list[key] === malStatus);
  }
  return list[simklStatus];
}

export function getCacheKey(id, simklId) {
  if (Number.isNaN(id) || !id) {
    return `simkl:${simklId}`;
  }
  return id;
}

export function simklIdToMal(simklId) {
  return this.call(`https://api.simkl.com/anime/${simklId}`, { extended: 'full' }, true).then(
    res => {
      if (typeof res.ids.mal === 'undefined') return null;
      return res.ids.mal;
    },
  );
}

export function getEpisode(episode: string): number {
  if (typeof episode === 'number') return episode;
  if (episode) {
    const temp = episode.match(/e\d+/i);
    if (temp !== null) {
      const episodePart = parseInt(temp[0].replace(/\D/, ''));
      if (Number.isNaN(episodePart)) return 0;
      return episodePart;
    }
  }
  return 0;
}

let cacheList;

// Importamos o tipo contentType para usar na assinatura da função
import { contentType } from '../definitions';

export async function syncList(lazy = false, requestedType?: contentType) {
  const logger = con.m('Simkl', '#9b7400').m('list');

  if (typeof cacheList === 'undefined') {
    cacheList = await api.storage.get('simklList');
  } else if (lazy && !requestedType) {
    return cacheList;
  }

  logger.log('Requested list type:', requestedType);

  // Inicializa a lista de cache se não existir
  if (!cacheList) cacheList = {};

  const lastCheck = await api.storage.get('simklLastCheck');
  const activity = await this.call('https://api.simkl.com/sync/activities');
  logger.log('Activity', lastCheck, activity);

  // Initialize activity structure if needed
  if (!activity.anime) activity.anime = { all: null, rated_at: null, removed_from_list: null };
  if (!activity.movies) activity.movies = { all: null, rated_at: null, removed_from_list: null };
  if (!activity.shows) activity.shows = { all: null, rated_at: null, removed_from_list: null };

  // removed_from_list para anime
  if (
    lastCheck &&
    lastCheck.anime &&
    activity.anime &&
    lastCheck.anime.removed_from_list !== activity.anime.removed_from_list
  ) {
    try {
      const checkRemoveList = await this.call('https://api.simkl.com/sync/all-items/anime');
      const newCacheList = {};
      if (checkRemoveList && checkRemoveList.anime) {
        for (let i = 0; i < checkRemoveList.anime.length; i++) {
          const el = checkRemoveList.anime[i];
          if (cacheList && cacheList[el.show.ids.simkl] !== undefined) {
            newCacheList[el.show.ids.simkl] = cacheList[el.show.ids.simkl];
          }
        }
      }
      cacheList = newCacheList;
      logger.log('remove anime', cacheList);
    } catch (e) {
      logger.error('Error removing anime from list', e);
    }
  }

  // removed_from_list para filmes
  if (
    lastCheck &&
    lastCheck.movies &&
    activity.movies &&
    lastCheck.movies.removed_from_list !== activity.movies.removed_from_list
  ) {
    try {
      const checkRemoveList = await this.call('https://api.simkl.com/sync/all-items/movies');
      const newCacheList = { ...cacheList };
      if (checkRemoveList && checkRemoveList.movies) {
        for (let i = 0; i < checkRemoveList.movies.length; i++) {
          const el = checkRemoveList.movies[i];
          if (
            el &&
            el.show &&
            el.show.ids &&
            el.show.ids.simkl &&
            cacheList &&
            cacheList[el.show.ids.simkl] !== undefined
          ) {
            newCacheList[el.show.ids.simkl] = el;
          }
        }
      }
      cacheList = newCacheList;
      logger.log('remove movies', cacheList);
    } catch (e) {
      logger.error('Error removing movies from list', e);
    }
  }

  // removed_from_list para séries
  if (
    lastCheck &&
    lastCheck.shows &&
    activity.shows &&
    lastCheck.shows.removed_from_list !== activity.shows.removed_from_list
  ) {
    try {
      const checkRemoveList = await this.call('https://api.simkl.com/sync/all-items/shows');
      const newCacheList = { ...cacheList };
      if (checkRemoveList && checkRemoveList.shows) {
        for (let i = 0; i < checkRemoveList.shows.length; i++) {
          const el = checkRemoveList.shows[i];
          if (
            el &&
            el.show &&
            el.show.ids &&
            el.show.ids.simkl &&
            cacheList &&
            cacheList[el.show.ids.simkl] !== undefined
          ) {
            newCacheList[el.show.ids.simkl] = el;
          }
        }
      }
      cacheList = newCacheList;
      logger.log('remove shows', cacheList);
    } catch (e) {
      logger.error('Error removing shows from list', e);
    }
  }

  // Check if update Needed
  let dateFromAnime = '';
  let dateFromMovies = '';
  let dateFromShows = '';

  if (lastCheck && cacheList) {
    if (lastCheck.anime && lastCheck.anime.all) {
      dateFromAnime = `date_from=${lastCheck.anime.all}`;
    } else if (lastCheck.all) {
      dateFromAnime = `date_from=${lastCheck.all}`;
    }

    if (lastCheck.movies && lastCheck.movies.all) {
      dateFromMovies = `date_from=${lastCheck.movies.all}`;
    } else if (lastCheck.all) {
      dateFromMovies = `date_from=${lastCheck.all}`;
    }

    if (lastCheck.shows && lastCheck.shows.all) {
      dateFromShows = `date_from=${lastCheck.shows.all}`;
    } else if (lastCheck.all) {
      dateFromShows = `date_from=${lastCheck.all}`;
    }

    // Verificamos se TODAS as listas estão atualizadas
    const animeUpToDate =
      lastCheck.anime && activity.anime && lastCheck.anime.all === activity.anime.all;
    const moviesUpToDate =
      lastCheck.movies && activity.movies && lastCheck.movies.all === activity.movies.all;
    const showsUpToDate =
      lastCheck.shows && activity.shows && lastCheck.shows.all === activity.shows.all;

    // Só consideramos tudo atualizado se todas as listas estiverem
    if (animeUpToDate && moviesUpToDate && showsUpToDate) {
      logger.log('All lists are up to date');
      return cacheList;
    } else {
      logger.log(
        'Lists need updating - Anime:',
        !animeUpToDate,
        'Movies:',
        !moviesUpToDate,
        'Shows:',
        !showsUpToDate,
      );
    }
  }

  if (!cacheList) cacheList = {};

  // Anime - Atualizamos se necessário ou se especificamente solicitado
  if (
    !requestedType ||
    requestedType === 'anime' ||
    !lastCheck?.anime?.all ||
    (lastCheck.anime && activity.anime && lastCheck.anime.all !== activity.anime.all)
  ) {
    logger.log('Updating anime list');

    // Avaliações
    if (lastCheck?.anime?.rated_at !== activity.anime?.rated_at) {
      try {
        const rated = await this.call(`https://api.simkl.com/sync/ratings/anime?${dateFromAnime}`);
        logger.log('ratedUpdate anime', rated);
        if (rated && rated.anime && rated.anime.length) {
          for (let i = 0; i < rated.anime.length; i++) {
            const el = rated.anime[i];
            if (el && el.show && el.show.ids && el.show.ids.simkl) {
              // Garante que o tipo está definido corretamente
              el.show.type = 'anime';
              cacheList[el.show.ids.simkl] = el;
            }
          }
        }
      } catch (e) {
        logger.error('Error updating anime ratings', e);
      }
    }

    // Lista completa
    try {
      const animeList = await this.call(
        `https://api.simkl.com/sync/all-items/anime?${dateFromAnime}`,
      );
      logger.log('listUpdate anime', animeList);
      logger.log('Anime structure example:', animeList?.anime?.[0]);

      if (animeList && animeList.anime && animeList.anime.length) {
        for (let i = 0; i < animeList.anime.length; i++) {
          const el = animeList.anime[i];
          if (el && el.show && el.show.ids && el.show.ids.simkl) {
            // Garante que o tipo está definido corretamente
            el.show.type = 'anime';
            cacheList[el.show.ids.simkl] = el;
          }
        }
      }
    } catch (e) {
      logger.error('Error updating anime list', e);
    }
  } else {
    logger.log('Anime list is up to date');
  }

  // Movies - SEMPRE atualizamos os filmes, a menos que seja solicitado apenas anime
  if (!requestedType || requestedType === 'movie') {
    logger.log('Updating movies list');

    // Avaliações de filmes
    if (lastCheck?.movies?.rated_at !== activity.movies?.rated_at) {
      try {
        const rated = await this.call(
          `https://api.simkl.com/sync/ratings/movies?${dateFromMovies}`,
        );
        logger.log('ratedUpdate movies', rated);
        if (rated && rated.movies && rated.movies.length) {
          for (let i = 0; i < rated.movies.length; i++) {
            const el = rated.movies[i];
            if (el && el.movie) {
              // Para filmes, o formato pode ser diferente (movie em vez de show)
              if (!el.show) {
                el.show = el.movie; // Normaliza a estrutura
              }

              // Garante que o tipo está definido
              el.show.type = 'movie';

              if (el.show.ids && el.show.ids.simkl) {
                cacheList[el.show.ids.simkl] = el;
              }
            }
          }
        }
      } catch (e) {
        logger.error('Error updating movie ratings', e);
      }
    }

    // Lista completa de filmes
    try {
      const moviesList = await this.call(`https://api.simkl.com/sync/all-items/movies`);
      logger.log('listUpdate movies', moviesList);
      if (moviesList && moviesList.movies && moviesList.movies.length) {
        for (let i = 0; i < moviesList.movies.length; i++) {
          const el = moviesList.movies[i];
          if (el && el.movie) {
            // Para filmes, o formato pode ser diferente (movie em vez de show)
            if (!el.show) {
              el.show = el.movie; // Normaliza a estrutura
            }

            // Garante que o tipo está definido
            el.show.type = 'movie';

            if (el.show.ids && el.show.ids.simkl) {
              cacheList[el.show.ids.simkl] = el;
            }
          }
        }
      }
    } catch (e) {
      logger.error('Error updating movie list', e);
    }
  }

  // TV Shows - SEMPRE atualizamos as séries, a menos que seja solicitado apenas anime ou filme
  if (!requestedType || requestedType === 'tv') {
    logger.log('Updating TV shows list');

    // Avaliações de séries
    if (lastCheck?.shows?.rated_at !== activity.shows?.rated_at) {
      try {
        const rated = await this.call(`https://api.simkl.com/sync/ratings/shows?${dateFromShows}`);
        logger.log('ratedUpdate shows', rated);
        if (rated && rated.shows && rated.shows.length) {
          for (let i = 0; i < rated.shows.length; i++) {
            const el = rated.shows[i];
            if (el && el.show && el.show.ids && el.show.ids.simkl) {
              // Garante que o tipo está definido corretamente
              el.show.type = 'tv';
              cacheList[el.show.ids.simkl] = el;
            }
          }
        }
      } catch (e) {
        logger.error('Error updating TV show ratings', e);
      }
    }

    // Lista completa de séries
    try {
      const showsList = await this.call(`https://api.simkl.com/sync/all-items/shows`);
      logger.log('listUpdate shows', showsList);
      logger.log('Shows structure example:', showsList?.shows?.[0]);

      if (showsList && showsList.shows && showsList.shows.length) {
        for (let i = 0; i < showsList.shows.length; i++) {
          const el = showsList.shows[i];
          if (el && el.show && el.show.ids && el.show.ids.simkl) {
            // Garante que o tipo está definido corretamente
            el.show.type = 'tv';
            cacheList[el.show.ids.simkl] = el;
          }
        }
      }
    } catch (e) {
      logger.error('Error updating TV show list', e);
    }
  }

  // Já tratamos filmes e séries acima, não precisamos duplicar o código
  // Verifica se temos dados na lista de cache
  const cacheListSize = Object.keys(cacheList).length;
  logger.log('totalList size:', cacheListSize);

  if (cacheListSize > 0) {
    logger.log('Saving cache list');
    await api.storage.set('simklList', cacheList);
    await api.storage.set('simklLastCheck', activity);
  } else {
    logger.error('Cache list is empty! Not saving to avoid data loss.');
  }

  return cacheList;
}

export async function getSingle(
  ids: { simkl?: string | number; mal?: string | number },
  lazy = false,
) {
  try {
    const list = (await this.syncList(lazy)) || {};

    if (ids.simkl && list[ids.simkl] !== undefined) {
      return list[ids.simkl];
    } else if (ids.mal) {
      // TODO: Use map for better performance
      const listVal = Object.values(list);
      for (let i = 0; i < listVal.length; i++) {
        const el: any = listVal[i];
        if (
          el &&
          el.show &&
          typeof el.show.ids !== 'undefined' &&
          typeof el.show.ids.mal !== 'undefined' &&
          Number(el.show.ids.mal) === Number(ids.mal)
        ) {
          return el;
        }
      }
    } else {
      throw 'No id passed';
    }
  } catch (e) {
    con.error('Error in getSingle', e);
  }
  return null;
}

export async function call(
  url,
  sData: any = {},
  asParameter = false,
  method: 'GET' | 'POST' = 'GET',
  login = true,
) {
  const logger = con.m('Simkl', '#9b7400').m('call');

  if (asParameter) {
    url += `?${new URLSearchParams(Object.entries(sData))}`;
    sData = undefined;
  }
  logger.log(method, url, sData);

  const headers: any = {
    'simkl-api-key': client_id,
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/json',
  };

  if (login) headers.Authorization = `Bearer ${api.settings.get('simklToken')}`;
  else logger.log('No login');

  if (method === 'GET') {
    sData = undefined;
  }

  return api.request
    .xhr(method, {
      url,
      headers,
      data: sData,
    })
    .then(async response => {
      const res = parseJson(response.responseText);
      this.errorHandling(res, response.status);
      return res;
    });
}

export function errorHandling(res, code) {
  if ((code > 499 && code < 600) || code === 0) {
    throw new ServerOfflineError(`Server Offline status: ${code}`);
  }

  if (res && typeof res.error !== 'undefined') {
    this.logger.error('[SINGLE]', 'Error', res.error);
    const { error } = res;
    if (error.code) {
      switch (error.code) {
        default:
          throw new Error(error.error);
      }
    } else {
      switch (error) {
        case 'user_token_failed':
          throw new NotAutenticatedError('user_token_failed');
        default:
          throw error;
      }
    }
  }
}
