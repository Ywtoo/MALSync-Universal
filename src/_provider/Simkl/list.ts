import { NotAutenticatedError } from '../Errors';
import { ListAbstract, listElement } from '../listAbstract';
import * as helper from './helper';
import * as definitions from '../definitions';

export class UserList extends ListAbstract {
  name = 'Simkl';

  authenticationUrl = helper.getAuthUrl();

  async getUserObject() {
    return this.call('https://api.simkl.com/users/settings').then(res => {
      if (res && res.user && typeof res.user.name !== 'undefined') {
        return {
          username: res.user.name,
          picture: res.user.avatar || '',
          href: `https://simkl.com/${res.account.id}`,
        };
      }

      throw new NotAutenticatedError('Not Authenticated');
    });
  }

  deauth() {
    return api.settings.set('simklToken', '');
  }

  errorHandling = helper.errorHandling;

  _getSortingOptions() {
    return [];
  }

  async getPart() {
    con.log('[UserList][Simkl]', `status: ${this.status}, listType: ${this.listType}`);
    if (this.listType === 'manga') throw new Error('Does not support manga');

    try {
      // Passa o tipo de lista (anime, movie, tv) para a função syncList
      const list = await this.syncList(false, this.listType as 'anime' | 'movie' | 'tv');
      this.done = true;

      if (!list) {
        con.log('[UserList][Simkl]', 'No list data found');
        return [];
      }

      const data = await this.prepareData(Object.values(list), this.listType, this.status);
      con.log('[UserList][Simkl]', 'Data processed', data);
      return data;
    } catch (e) {
      con.error('[UserList][Simkl]', 'Error getting part', e);
      this.done = true;
      throw e;
    }
  }

  private async prepareData(data, listType: 'anime' | 'manga' | 'movie' | 'tv', status): Promise<listElement[]> {
    const newData = [] as listElement[];
    if (!data || !data.length) {
      con.log('[UserList][Simkl]', 'No data found');
      return newData;
    }

    con.log(
      '[UserList][Simkl]',
      `Filtering for listType: ${listType}, total items: ${data.length}`,
    );

    // Filtra os dados pelo tipo solicitado
    const filteredData = data.filter(el => {
      if (!el || !el.show) return false;

      // Verifica o tipo do item
      const itemType = el.show.type || 'anime';

      // Filtra de acordo com o tipo solicitado
      if (listType === 'anime' && itemType === 'anime') return true;
      if (listType === 'movie' && itemType === 'movie') return true;
      if (listType === 'tv' && (itemType === 'tv' || itemType === 'show')) return true;

      return false;
    });

    con.log('[UserList][Simkl]', `Filtered to ${filteredData.length} items of type ${listType}`);

    for (let i = 0; i < filteredData.length; i++) {
      const el = filteredData[i];
      // Verify that all required properties exist
      if (!el || !el.show || !el.show.ids || !el.show.ids.simkl) {
        con.log('[UserList][Simkl]', 'Invalid element found', el);
        continue;
      }

      const st = this.translateList(el.status || 'plantowatch');
      if (status !== definitions.status.All && parseInt(st) !== status) {
        continue;
      }

      let curep = this.getEpisode(el.last_watched || '');
      if (st === definitions.status.Completed) {
        if (el.show.type === 'movie') {
          // Para filmes, consideramos como 1 episódio total
          curep = 1;
        } else if (el.total_episodes_count) {
          curep = el.total_episodes_count;
        }
      }

      // Obtém os IDs do item
      const showIds = {
        simkl: el.show.ids?.simkl,
        mal: el.show.ids?.mal,
      };

      // Determina o tipo e URL com base no tipo de mídia
      const mediaType = el.show.type;
      let mediaUrl;

      // Determina a URL correta com base no tipo de mídia
      if (mediaType === 'movie') {
        mediaUrl = `https://simkl.com/movies/${showIds.simkl}`;
      } else if (mediaType === 'tv' || mediaType === 'show') {
        mediaUrl = `https://simkl.com/shows/${showIds.simkl}`;
      } else {
        mediaUrl = `https://simkl.com/anime/${showIds.simkl}`;
      }

      con.log(`[UserList][Simkl] Processing ${mediaType} item:`, el.show.title);

      try {
        // Configura o total de episódios corretamente para filmes
        let totalEpisodes = el.total_episodes_count || 0;
        if (mediaType === 'movie' && totalEpisodes === 0) {
          totalEpisodes = 1; // Um filme é contado como um único episódio
        }

        const tempData = await this.fn({
          malId: showIds.mal,
          apiCacheKey: showIds.mal,
          uid: showIds.simkl,
          cacheKey: this.getCacheKey(showIds.mal, showIds.simkl),
          type: mediaType,
          title: el.show.title || `Unknown ${mediaType}`,
          url: mediaUrl,
          score: el.user_rating ? el.user_rating : 0,
          watchedEp: curep || 0,
          totalEp: totalEpisodes,
          status: st,
          image: el.show.poster ? `https://simkl.in/posters/${el.show.poster}_ca.jpg` : '',
          imageLarge: el.show.poster ? `https://simkl.in/posters/${el.show.poster}_m.jpg` : '',
          imageBanner: el.show.poster ? `https://simkl.in/posters/${el.show.poster}_w.jpg` : '',
          tags: el.private_memo || '',
          airingState: el.anime_airing_status || 0,
        });
        newData.push(tempData);
      } catch (e) {
        con.error('[UserList][Simkl]', 'Error processing item', e, el);
      }
    }
    return newData;
  }

  protected syncList = helper.syncList;

  protected translateList = helper.translateList;

  protected getCacheKey = helper.getCacheKey;

  protected getEpisode = helper.getEpisode;

  protected call = helper.call;
}
